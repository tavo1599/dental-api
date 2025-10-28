import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BudgetItem } from './budget-item.entity';
import { User } from '../../users/entities/user.entity';

export enum BudgetStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity({ name: 'budgets' })
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  creationDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    default: 0,
    comment: 'Descuento de monto fijo (ej. 50)' 
  })
  discountAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Monto final después de aplicar descuento'
  })
  finalAmount: number;

@Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  paidAmount: number;

  @Column({ type: 'enum', enum: BudgetStatus, default: BudgetStatus.PENDING })
  status: BudgetStatus;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;
  

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  // --- 2. AÑADE ESTA NUEVA RELACIÓN ---
  @ManyToOne(() => User, { nullable: true }) // Puede ser nulo si es un presupuesto administrativo
  doctor?: User;
  // --- FIN ---

  // Un presupuesto tiene MUCHOS items
  @OneToMany(() => BudgetItem, (item) => item.budget, { cascade: true })
  items: BudgetItem[];
}