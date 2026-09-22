import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';
import { ProductLot } from './product-lot.entity';

export enum StockMovementType {
  PURCHASE = 'compra',
  SALE = 'venta',
  TREATMENT_USE = 'consumo',
  ADJUSTMENT = 'ajuste',
  RETURN = 'devolucion',
  LOSS = 'merma',
}

/**
 * ============================================================================
 * KARDEX: cada entrada y salida de inventario
 *
 * Es la FUENTE DE VERDAD del stock. Se guarda el movimiento, nunca se edita ni
 * se borra: corregir un error es registrar un ajuste, igual que en contabilidad.
 * Asi queda trazable quien saco que, cuando y para que, que en un contexto
 * clinico acaba haciendo falta.
 *
 * `quantity` va CON SIGNO: positivo entra, negativo sale. De ese modo el stock
 * de una sede es literalmente SUM(quantity), sin logica condicional que se
 * pueda equivocar.
 * ============================================================================
 */
@Index(['tenant', 'branch'])
@Index(['product', 'branch'])
@Entity({ name: 'stock_movements' })
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  product: Product;

  @ManyToOne(() => Branch, { nullable: false, onDelete: 'RESTRICT' })
  branch: Branch;

  /**
   * Lote concreto que entro o salio. Permite reconstruir que caducidad se
   * consumio en cada movimiento, no solo cuanto.
   */
  @ManyToOne(() => ProductLot, { nullable: true, onDelete: 'SET NULL' })
  lot: ProductLot | null;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  /** Con signo: positivo = entrada, negativo = salida. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  /** Costo unitario del movimiento (sobre todo en compras). */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost: number;

  /** Existencias de esa sede DESPUES de aplicar este movimiento. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balanceAfter: number;

  /** A que se debe el movimiento: 'sale', 'treatment', 'purchase'... */
  @Column({ type: 'varchar', length: 30, nullable: true })
  referenceType: string | null;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true })
  user: User | null;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;
}
