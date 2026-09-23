import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import {
  AdminTransfer,
  AdminTransferStatus,
} from './entities/admin-transfer.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { ClinicSpecialty, professionalLabel } from '../tenants/specialty';

/** El codigo caduca pronto a proposito: es para usarlo en el momento. */
const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AdminTransferService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AdminTransfer)
    private readonly transferRepository: Repository<AdminTransfer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Paso 1: el titular pide entregar la cuenta a otro usuario de su clinica.
   * El codigo va al correo del titular ACTUAL: quien controle ese correo es
   * quien autoriza el cambio.
   */
  async request(currentAdminId: string, toUserId: string, tenantId: string) {
    const currentAdmin = await this.userRepository.findOne({
      where: { id: currentAdminId, tenant: { id: tenantId } },
    });
    if (!currentAdmin || currentAdmin.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'Solo el titular de la clínica puede transferir la administración.',
      );
    }

    const target = await this.resolveTarget(toUserId, tenantId);

    // Una transferencia pendiente a la vez: si pide otra, la anterior se anula.
    await this.transferRepository.update(
      { tenant: { id: tenantId }, status: AdminTransferStatus.PENDING },
      { status: AdminTransferStatus.CANCELLED },
    );

    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_TTL_MINUTES);

    await this.transferRepository.save(
      this.transferRepository.create({
        tenant: { id: tenantId } as Tenant,
        fromUser: currentAdmin,
        toUser: target,
        codeHash: this.hash(code),
        expiresAt,
        status: AdminTransferStatus.PENDING,
        attempts: 0,
      }),
    );

    const profesion = professionalLabel(await this.tenantSpecialty(tenantId));
    await this.mailService.sendAdminTransferCode(
      currentAdmin,
      target,
      code,
      profesion,
    );

    return {
      message: `Se envió un código de verificación a ${this.maskEmail(currentAdmin.email)}. Caduca en ${CODE_TTL_MINUTES} minutos.`,
      toUser: { id: target.id, fullName: target.fullName },
      expiresAt,
    };
  }

  /** Paso 2: el titular introduce el codigo que le llego por correo. */
  async confirm(currentAdminId: string, code: string, tenantId: string) {
    const transfer = await this.transferRepository.findOne({
      where: { tenant: { id: tenantId }, status: AdminTransferStatus.PENDING },
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });

    if (!transfer) {
      throw new BadRequestException('No hay ninguna transferencia pendiente.');
    }
    if (transfer.fromUser?.id !== currentAdminId) {
      throw new BadRequestException(
        'Solo quien solicitó la transferencia puede confirmarla.',
      );
    }
    if (transfer.expiresAt && transfer.expiresAt < new Date()) {
      transfer.status = AdminTransferStatus.CANCELLED;
      await this.transferRepository.save(transfer);
      throw new BadRequestException(
        'El código caducó. Solicita la transferencia de nuevo.',
      );
    }
    if (transfer.attempts >= MAX_ATTEMPTS) {
      transfer.status = AdminTransferStatus.CANCELLED;
      await this.transferRepository.save(transfer);
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita la transferencia de nuevo.',
      );
    }

    if (transfer.codeHash !== this.hash(code.trim())) {
      transfer.attempts += 1;
      await this.transferRepository.save(transfer);
      const quedan = MAX_ATTEMPTS - transfer.attempts;
      throw new BadRequestException(
        `Código incorrecto. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.`,
      );
    }

    return this.execute(transfer, tenantId, false);
  }

  async cancel(tenantId: string) {
    await this.transferRepository.update(
      { tenant: { id: tenantId }, status: AdminTransferStatus.PENDING },
      { status: AdminTransferStatus.CANCELLED },
    );
    return { message: 'Transferencia cancelada.' };
  }

  /** Transferencia pendiente, para que la interfaz sepa si mostrar el paso 2. */
  async findPending(tenantId: string) {
    const transfer = await this.transferRepository.findOne({
      where: { tenant: { id: tenantId }, status: AdminTransferStatus.PENDING },
      relations: ['toUser'],
      order: { createdAt: 'DESC' },
    });
    if (!transfer || (transfer.expiresAt && transfer.expiresAt < new Date())) {
      return null;
    }
    return {
      toUser: transfer.toUser
        ? { id: transfer.toUser.id, fullName: transfer.toUser.fullName }
        : null,
      expiresAt: transfer.expiresAt,
      attemptsLeft: MAX_ATTEMPTS - transfer.attempts,
    };
  }

  /**
   * Via de respaldo: la ejecuta el super admin sin codigo. Es para cuando el
   * titular ya no trabaja en la clinica o perdio el acceso a su correo y nadie
   * puede recibir el codigo. Queda marcada como forzada.
   */
  async forceBySuperAdmin(tenantId: string, toUserId: string) {
    const target = await this.resolveTarget(toUserId, tenantId);
    const currentAdmin = await this.userRepository.findOne({
      where: { tenant: { id: tenantId }, role: UserRole.ADMIN },
    });

    const transfer = await this.transferRepository.save(
      this.transferRepository.create({
        tenant: { id: tenantId } as Tenant,
        fromUser: currentAdmin ?? null,
        toUser: target,
        codeHash: null,
        expiresAt: null,
        status: AdminTransferStatus.PENDING,
        forcedBySuperAdmin: true,
      }),
    );
    transfer.fromUser = currentAdmin ?? null;
    transfer.toUser = target;

    return this.execute(transfer, tenantId, true);
  }

  // =========================================================================
  // INTERNOS
  // =========================================================================

  /**
   * Hace el cambio de roles en UNA transaccion. Si algo falla a mitad, la
   * clinica no puede quedarse con dos titulares ni con ninguno.
   */
  private async execute(
    transfer: AdminTransfer,
    tenantId: string,
    forced: boolean,
  ) {
    const saliente = transfer.fromUser;
    // Como se le llama al saliente depende del rubro: en un consultorio de
    // psicologia no pasa a ser "dentista".
    const rubro = await this.tenantSpecialty(tenantId);
    const profesion = professionalLabel(rubro);
    const entrante = transfer.toUser;
    if (!entrante) {
      throw new BadRequestException(
        'El usuario que recibiría la administración ya no existe.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // El saliente sigue trabajando como doctor: conserva su agenda y sus
      // pacientes, solo pierde la configuracion de la clinica.
      if (saliente) {
        await manager.update(User, saliente.id, { role: UserRole.DENTIST });
      }
      await manager.update(User, entrante.id, { role: UserRole.ADMIN });

      await manager.update(AdminTransfer, transfer.id, {
        status: AdminTransferStatus.COMPLETED,
        completedAt: new Date(),
        codeHash: null, // no se conserva una vez usado
        forcedBySuperAdmin: forced,
      });
    });

    // Se avisa a ambos: el saliente debe enterarse aunque no lo haya hecho el.
    await this.mailService
      .sendAdminTransferDone(saliente, entrante, forced, profesion)
      .catch(() => undefined);

    return {
      message: `${entrante.fullName} es ahora el administrador de la clínica.${
        saliente ? ` ${saliente.fullName} pasa a ser ${profesion}.` : ''
      }`,
      newAdmin: { id: entrante.id, fullName: entrante.fullName },
    };
  }

  /** Rubro de la clinica, solo para elegir la palabra del mensaje. */
  private async tenantSpecialty(tenantId: string): Promise<ClinicSpecialty> {
    const fila = await this.dataSource.query(
      `SELECT specialty FROM tenants WHERE id = $1`,
      [tenantId],
    );
    return fila?.[0]?.specialty ?? ClinicSpecialty.DENTAL;
  }

  private async resolveTarget(toUserId: string, tenantId: string) {
    const target = await this.userRepository.findOne({
      where: { id: toUserId, tenant: { id: tenantId } },
    });
    if (!target) {
      throw new NotFoundException(
        'El usuario no existe o no pertenece a esta clínica.',
      );
    }
    if (target.role === UserRole.ADMIN) {
      throw new BadRequestException('Ese usuario ya es el titular de la clínica.');
    }
    if (target.isActive === false) {
      throw new BadRequestException(
        'No se puede transferir la administración a un usuario inhabilitado.',
      );
    }
    return target;
  }

  /** 6 digitos con generador criptografico, no Math.random(). */
  private generateCode(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /** a***o@correo.com — para confirmar a donde fue sin exponer el correo. */
  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain || name.length <= 2) return email;
    const ultimo = name[name.length - 1];
    return `${name[0]}${'*'.repeat(Math.max(1, name.length - 2))}${ultimo}@${domain}`;
  }
}
