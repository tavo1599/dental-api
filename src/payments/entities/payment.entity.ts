import { Budget } from '../../budgets/entities/budget.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Check, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentMethod {
  CASH = 'cash', // Efectivo
  YAPE = 'yape',
  CARD = 'card', // Tarjeta
  TRANSFER = 'transfer', // Transferencia
  OTHER = 'other',
}

@Index(['tenant', 'branch'])
// La base garantiza que un pago apunte SIEMPRE a exactamente una cosa: un
// presupuesto de tratamientos o una venta de productos. Sin esto, un bug en el
// codigo podria dejar pagos huerfanos que descuadrarian la caja en silencio.
@Check(
  'CHK_payment_budget_xor_sale',
  '("budgetId" IS NOT NULL AND "saleId" IS NULL) OR ("budgetId" IS NULL AND "saleId" IS NOT NULL)',
)
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

  /**
   * Un pago cubre O un presupuesto de tratamientos O una venta de productos,
   * nunca ambos. Ambas relaciones son opcionales y una restriccion CHECK en la
   * base garantiza que siempre haya exactamente una.
   *
   * Se unifico asi a proposito: con dos tablas de pagos separadas, el cierre de
   * caja y el reporte financiero tendrian que sumar dos fuentes y acabarian
   * descuadrando.
   */
  @ManyToOne(() => Budget, { nullable: true, onDelete: 'CASCADE' })
  budget: Budget | null;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'CASCADE' })
  sale: Sale | null;

  @ManyToOne(() => User)
  registeredBy: User; // Usuario que registró el pago

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  /**
   * Sede a la que pertenece el pago (donde se cobro).
   * RESTRICT: una sede con movimientos no se puede borrar, solo desactivar.
   */
  @ManyToOne(() => Branch, { nullable: false, onDelete: 'RESTRICT' })
  branch: Branch;
}