import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';
import { BudgetItem } from './budget-item.entity';
import { User } from '../../users/entities/user.entity';
import { Payment } from '../../payments/entities/payment.entity'; // <-- Importar Payment

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

  @UpdateDateColumn() // Recomendado tener fecha de actualización
  updatedAt: Date;

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

  // --- NUEVOS CAMPOS PARA ORTODONCIA ---
  
  @Column({ default: false })
  isOrthodontic: boolean;

  @Column({ nullable: true })
  orthoType: string; // 'preventive' | 'corrective'

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  baseTreatmentCost: number; // Honorarios base

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  initialPayment: number; // Cuota inicial

  @Column({ type: 'int', nullable: true, default: 0 })
  installments: number; // Número de cuotas

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  monthlyPayment: number; // Monto mensual calculado
  
  // -------------------------------------

  @ManyToOne(() => Patient, (patient) => patient.budgets, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @ManyToOne(() => User, { nullable: true })
  doctor?: User;

  // Un presupuesto tiene MUCHOS items
  @OneToMany(() => BudgetItem, (item) => item.budget, { cascade: true })
  items: BudgetItem[];

  // Un presupuesto tiene MUCHOS pagos (Necesario para el reporte)
  @OneToMany(() => Payment, (payment) => payment.budget)
  payments: Payment[];
}