import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetItem } from './entities/budget-item.entity';
import { TreatmentSessionLog } from './entities/treatment-session-log.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';

/** Avance de un paquete, tal como se le muestra a quien atiende. */
export interface SessionPackage {
  budgetItemId: string;
  budgetId: string;
  treatmentName: string;
  sessionsTotal: number;
  sessionsDone: number;
  sessionsLeft: number;
  isComplete: boolean;
  sessions: Array<{
    id: string;
    performedAt: string;
    performedBy: string | null;
    notes: string | null;
  }>;
}

/**
 * ============================================================================
 * SESIONES DE UN PAQUETE
 *
 * Quien cobra por sesiones necesita saber por donde va un paciente. El avance
 * se CUENTA de treatment_session_logs y no se guarda en un contador: asi no
 * hay dos verdades que puedan discrepar, y una sesion mal registrada se
 * corrige borrandola.
 *
 * Solo se consideran los presupuestos que la clinica ya acepto: un paquete
 * rechazado o aun pendiente no se esta prestando.
 * ============================================================================
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(TreatmentSessionLog)
    private readonly logRepository: Repository<TreatmentSessionLog>,
    @InjectRepository(BudgetItem)
    private readonly itemRepository: Repository<BudgetItem>,
  ) {}

  /**
   * Paquetes de un paciente con su avance.
   *
   * Se excluyen los items de una sola sesion: un empaste no es un paquete y
   * mostrarlo como "sesion 1 de 1" solo seria ruido.
   */
  async findPackagesForPatient(
    patientId: string,
    tenantId: string,
  ): Promise<SessionPackage[]> {
    const items = await this.itemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.budget', 'budget')
      .innerJoinAndSelect('item.treatment', 'treatment')
      .where('budget."patientId" = :patientId', { patientId })
      .andWhere('budget."tenantId" = :tenantId', { tenantId })
      .andWhere(`budget.status IN ('approved', 'in_progress', 'completed')`)
      .andWhere('item."sessionsTotal" > 1')
      .orderBy('budget."creationDate"', 'DESC')
      .getMany();

    if (!items.length) return [];

    const logs = await this.logRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
      relations: ['budgetItem', 'performedBy'],
      order: { performedAt: 'ASC' },
    });

    return items.map((item) => {
      const propias = logs.filter((l) => l.budgetItem?.id === item.id);
      const hechas = propias.length;
      return {
        budgetItemId: item.id,
        budgetId: (item as any).budget?.id,
        treatmentName: (item as any).treatment?.name ?? 'Servicio',
        sessionsTotal: item.sessionsTotal,
        sessionsDone: hechas,
        sessionsLeft: Math.max(0, item.sessionsTotal - hechas),
        isComplete: hechas >= item.sessionsTotal,
        sessions: propias.map((l) => ({
          id: l.id,
          performedAt: l.performedAt,
          performedBy: l.performedBy?.fullName ?? null,
          notes: l.notes,
        })),
      };
    });
  }

  /** Deja constancia de una sesion realizada. */
  async registerSession(
    budgetItemId: string,
    tenantId: string,
    branchId: string | null,
    userId: string,
    datos: { performedAt?: string; notes?: string },
  ) {
    // Se cargan paciente y sede del presupuesto: TypeORM no expone las
    // columnas FK si no se declaran, asi que sin estos joins budget.patientId
    // llega vacio y el registro falla al guardar.
    const item = await this.itemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.budget', 'budget')
      .innerJoinAndSelect('item.treatment', 'treatment')
      .innerJoinAndSelect('budget.patient', 'patient')
      .leftJoinAndSelect('budget.branch', 'budgetBranch')
      .where('item.id = :id', { id: budgetItemId })
      .andWhere('budget."tenantId" = :tenantId', { tenantId })
      .getOne();

    if (!item) {
      throw new NotFoundException(
        'El servicio no existe o no pertenece a esta clínica.',
      );
    }

    const budget: any = (item as any).budget;

    if (!['approved', 'in_progress', 'completed'].includes(budget.status)) {
      throw new BadRequestException(
        'El presupuesto aún no está aprobado, así que todavía no hay sesiones que registrar.',
      );
    }

    const hechas = await this.logRepository.count({
      where: { budgetItem: { id: budgetItemId }, tenant: { id: tenantId } },
    });
    if (hechas >= item.sessionsTotal) {
      throw new BadRequestException(
        `Ya se registraron las ${item.sessionsTotal} sesiones de este paquete. Si hacen falta más, amplía el presupuesto.`,
      );
    }

    // La sede sale del contexto de la peticion; si se trabaja en consolidado se
    // usa la del presupuesto, que es donde se vendio el paquete.
    const sede = branchId ?? budget.branch?.id ?? null;
    if (!sede) {
      throw new BadRequestException(
        'No se pudo determinar la sede de la sesión.',
      );
    }

    const log = this.logRepository.create({
      budgetItem: { id: budgetItemId } as BudgetItem,
      patient: { id: budget.patient.id } as Patient,
      tenant: { id: tenantId } as Tenant,
      branch: { id: sede } as Branch,
      performedBy: { id: userId } as User,
      // Por defecto hoy, en hora local: una columna `date` no tiene zona y
      // convertirla desde UTC haria retroceder la fecha un dia en Peru.
      performedAt: datos.performedAt ?? this.hoy(),
      notes: datos.notes?.trim() || null,
    });
    await this.logRepository.save(log);

    const total = hechas + 1;
    return {
      message: `Sesión ${total} de ${item.sessionsTotal} registrada.`,
      sessionsDone: total,
      sessionsTotal: item.sessionsTotal,
      sessionsLeft: Math.max(0, item.sessionsTotal - total),
    };
  }

  /** Deshace una sesion registrada por error. */
  async removeSession(sessionId: string, tenantId: string) {
    const log = await this.logRepository.findOne({
      where: { id: sessionId, tenant: { id: tenantId } },
    });
    if (!log) {
      throw new NotFoundException(
        'La sesión no existe o no pertenece a esta clínica.',
      );
    }
    await this.logRepository.remove(log);
    return { message: 'Sesión eliminada del registro.' };
  }

  private hoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
