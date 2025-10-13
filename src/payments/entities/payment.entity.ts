import { Budget } from '../../budgets/entities/budget.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentMethod {
  CASH = 'cash', // Efectivo
  YAPE = 'yape',
  CARD = 'card', // Tarjeta
  TRANSFER = 'transfer', // Transferencia
  OTHER = 'other',
}

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

   @Column({ type: 'date' })
  paymentDate: Date;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column('text', { nullable: true })
  notes?: string;

  @ManyToOne(() => Budget, { onDelete: 'CASCADE' })
  budget: Budget;

  @ManyToOne(() => User)
  registeredBy: User; // Usuario que registró el pago

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}