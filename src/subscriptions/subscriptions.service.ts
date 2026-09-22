import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { daysUntil, formatLongDate, startOfToday } from '../common/billing-dates';

/**
 * Dias de margen despues del vencimiento antes de desactivar la cuenta.
 * Cambiar este numero cambia la politica de cobro entera; no hay ningun otro
 * sitio donde este escrito.
 */
export const GRACE_DAYS = 5;

/** Dias de antelacion del primer recordatorio. */
const REMINDER_DAYS_BEFORE = 3;

/** Lo que el proceso decidio hacer con una clinica, para poder revisarlo. */
export interface SubscriptionAction {
  tenantId: string;
  clinicName: string;
  dueDate: string;
  daysOverdue: number;
  action: 'recordatorio' | 'vence-hoy' | 'desactivada' | 'ninguna';
  notifiedTo: string | null;
}

/**
 * ============================================================================
 * COBRO DE SUSCRIPCIONES
 *
 * Una vez al dia revisa que clinicas tienen el pago por vencer o vencido:
 *
 *   3 dias antes  -> correo de aviso
 *   el mismo dia  -> correo "vence hoy"
 *   +5 dias       -> se desactiva la cuenta y se avisa por correo
 *
 * Lo importante de este proceso es que hace cumplir sola la regla de que
 * nadie deba mas de un mes. Antes dependia de que alguien entrara a mirar la
 * tabla del panel.
 *
 * Que NO hace:
 *  - No toca las clinicas en SUSPENDED. Ese estado lo pone una persona cuando
 *    el cliente decide no continuar; no es lo mismo que un impago.
 *  - No toca las clinicas de prueba (isTest).
 *  - No borra absolutamente nada. Desactivar solo impide entrar.
 * ============================================================================
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 8 de la manana de Lima. La zona va explicita: el contenedor corre en UTC y
   * sin esto los correos saldrian a las 3 de la madrugada.
   */
  @Cron('0 8 * * *', { name: 'revision-de-cobros', timeZone: 'America/Lima' })
  async handleDailyCheck() {
    // Interruptor a proposito apagado por defecto. Desplegar este codigo no
    // debe cortarle el acceso a nadie: hay clinicas con fechas viejas de
    // cuando esto no existia y se desactivarian todas de golpe. Primero se
    // mira la simulacion (GET /super-admin/subscriptions/preview), se corrigen
    // las fechas, y solo entonces se pone SUBSCRIPTION_ENFORCEMENT=true.
    if (this.configService.get<string>('SUBSCRIPTION_ENFORCEMENT') !== 'true') {
      this.logger.log(
        'Revisión de cobros desactivada (SUBSCRIPTION_ENFORCEMENT no está en true).',
      );
      return;
    }

    const acciones = await this.run(false);
    const hechas = acciones.filter((a) => a.action !== 'ninguna');
    this.logger.log(
      `Revisión de cobros: ${acciones.length} clínicas revisadas, ${hechas.length} con acción.`,
    );
    for (const a of hechas) {
      this.logger.log(`  ${a.clinicName}: ${a.action} (vence ${a.dueDate})`);
    }
  }

  /**
   * Lo mismo que hace el proceso diario pero sin tocar nada. Sirve para ver a
   * quien afectaria antes de que corra de verdad, que es justo lo que hace
   * falta la primera vez que esto se pone en produccion.
   */
  async preview(): Promise<SubscriptionAction[]> {
    return this.run(true);
  }

  private async run(soloSimular: boolean): Promise<SubscriptionAction[]> {
    const hoy = startOfToday();

    const tenants = await this.tenantRepository
      .createQueryBuilder('t')
      .where('t.status = :activa', { activa: TenantStatus.ACTIVE })
      .andWhere('t."nextPaymentDate" IS NOT NULL')
      .andWhere('t."isTest" = false')
      // La clinica interna del propio sistema no se cobra a si misma. Se
      // detecta por tener un super admin dentro y no por una lista de ids,
      // para que siga funcionando si algun dia se crea otra.
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM "users" u
           WHERE u."tenantId" = t."id" AND u."isSuperAdmin" = true
         )`,
      )
      // Tiene que haber alguien a quien cortarle el acceso. Hay filas de
      // clinicas sin un solo usuario (restos de pruebas viejas): desactivarlas
      // no le hace nada a nadie y solo ensucia el registro.
      .andWhere(
        `EXISTS (
           SELECT 1 FROM "users" u
           WHERE u."tenantId" = t."id" AND u."isActive" = true
         )`,
      )
      .getMany();

    const acciones: SubscriptionAction[] = [];

    for (const tenant of tenants) {
      const restantes = daysUntil(hoy, tenant.nextPaymentDate!);
      const vencimiento = formatLongDate(tenant.nextPaymentDate!);

      const accion: SubscriptionAction = {
        tenantId: tenant.id,
        clinicName: tenant.name,
        dueDate: vencimiento,
        daysOverdue: restantes < 0 ? -restantes : 0,
        action: 'ninguna',
        notifiedTo: null,
      };

      // Se pasó del margen: se corta el acceso.
      if (restantes <= -GRACE_DAYS) {
        accion.action = 'desactivada';
        accion.notifiedTo = await this.destinatario(tenant);
        if (!soloSimular) {
          await this.tenantRepository.update(tenant.id, {
            status: TenantStatus.INACTIVE,
          });
          if (accion.notifiedTo) {
            await this.mailService.sendAccountInactivated(
              tenant.name,
              accion.notifiedTo,
              vencimiento,
            );
          } else {
            this.logger.warn(
              `${tenant.name} se desactivó pero no tiene a quién avisarle.`,
            );
          }
        }
        acciones.push(accion);
        continue;
      }

      const toca =
        restantes === REMINDER_DAYS_BEFORE
          ? 'recordatorio'
          : restantes === 0
            ? 'vence-hoy'
            : null;

      if (!toca) {
        acciones.push(accion);
        continue;
      }

      // Si ya se le escribió hoy no se le vuelve a escribir: el proceso puede
      // correr dos veces si se reinicia el servidor.
      if (this.yaAvisadoHoy(tenant, hoy)) {
        acciones.push(accion);
        continue;
      }

      accion.action = toca;
      accion.notifiedTo = await this.destinatario(tenant);

      if (!soloSimular && accion.notifiedTo) {
        const enviado = await this.mailService.sendPaymentReminder(
          tenant.name,
          accion.notifiedTo,
          vencimiento,
          restantes,
          GRACE_DAYS,
        );
        // Solo se marca como avisada si el correo salió de verdad; si falló,
        // mañana se vuelve a intentar en lugar de darla por avisada.
        if (enviado) {
          await this.tenantRepository.update(tenant.id, {
            lastPaymentNoticeAt: hoy,
          });
        }
      }

      acciones.push(accion);
    }

    return acciones;
  }

  private yaAvisadoHoy(tenant: Tenant, hoy: Date): boolean {
    if (!tenant.lastPaymentNoticeAt) return false;
    return daysUntil(tenant.lastPaymentNoticeAt, hoy) === 0;
  }

  /**
   * A quien se le avisa: al titular de la clinica. Si no hay (puede pasar
   * durante una transferencia), se cae al correo de contacto de la clinica.
   */
  private async destinatario(tenant: Tenant): Promise<string | null> {
    const admin = await this.userRepository.findOne({
      where: { tenant: { id: tenant.id }, role: UserRole.ADMIN, isActive: true },
      select: { id: true, email: true },
    });
    return admin?.email ?? tenant.email ?? null;
  }
}
