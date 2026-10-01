import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BudgetItem } from './budget-item.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

/**
 * ============================================================================
 * SESIONES REALIZADAS
 *
 * Una fila por sesion hecha. El avance ("sesion 3 de 10") se CUENTA de aqui en
 * lugar de guardarse en un contador, igual que el stock se calcula del kardex:
 * un contador se desincroniza en cuanto algo falla a mitad, y una fila mal
 * registrada se corrige borrandola.
 *
 * Esto es lo que necesita quien cobra por sesiones -psicologia, estetica,
 * tambien ortodoncia- para saber por donde va un paciente sin llevarlo en
 * papel.
 *
 * La sesion queda atada al ITEM del presupuesto, no al tratamiento del
 * catalogo: dos pacientes pueden tener paquetes distintos del mismo servicio,
 * y el precio y el numero de sesiones de cada uno son los que se pactaron.
 * ============================================================================
 */
@Index(['tenant', 'patient'])
@Entity({ name: 'treatment_session_logs' })
export class TreatmentSessionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Paquete al que pertenece esta sesion. */
  @ManyToOne(() => BudgetItem, { nullable: false, onDelete: 'CASCADE' })
  budgetItem: BudgetItem;

  /**
   * Se guarda aparte del item aunque se pueda deducir de el: asi se pueden
   * listar las sesiones de un paciente sin recorrer todos sus presupuestos.
   */
  @ManyToOne(() => Patient, { nullable: false, onDelete: 'CASCADE' })
  patient: Patient;

  @Column({ type: 'date', comment: 'Dia en que se realizo la sesion' })
  performedAt: string;

  /** Quien la atendio. SET NULL para no perder la sesion si el usuario se va. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  performedBy: User | null;

  @Column({ type: 'text', nullable: true, comment: 'Nota breve de la sesión' })
  notes: string | null;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  /** Sede donde se realizo, para que cuadre con la caja y los reportes. */
  @ManyToOne(() => Branch, { nullable: false })
  branch: Branch;

  @CreateDateColumn()
  createdAt: Date;
}
