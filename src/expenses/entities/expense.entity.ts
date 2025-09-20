import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum ExpenseCategory {
  SALARIES = 'salarios',
  SUPPLIES = 'insumos',
  RENT = 'alquiler',
  UTILITIES = 'servicios_publicos',
  MARKETING = 'marketing',
  OTHER = 'otros',
}

@Entity({ name: 'expenses' })
export class Expense { // <-- Asegúrate de que 'export' esté aquí
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER,
  })
  category: ExpenseCategory;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}