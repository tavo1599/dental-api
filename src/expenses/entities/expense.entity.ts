import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum ExpenseCategory {
  SALARIES = 'salarios',
  SUPPLIES = 'insumos',
  RENT = 'alquiler',
  UTILITIES = 'servicios_publicos',
  MARKETING = 'marketing',
  OTHER = 'otros',
}

@Index(['tenant', 'branch'])
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

  /**
   * Sede a la que pertenece el gasto.
   * RESTRICT: una sede con movimientos no se puede borrar, solo desactivar.
   */
  @ManyToOne(() => Branch, { nullable: false, onDelete: 'RESTRICT' })
  branch: Branch;
}