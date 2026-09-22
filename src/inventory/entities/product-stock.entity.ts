import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Product } from './product.entity';

/**
 * ============================================================================
 * EXISTENCIAS POR SEDE
 *
 * El stock NO puede vivir en Product: el mismo producto tiene cantidades
 * distintas en cada sucursal. Una fila por (producto, sede).
 *
 * `quantity` es un valor DESNORMALIZADO: la verdad son los movimientos del
 * kardex (StockMovement). Se mantiene aqui para que los listados no tengan que
 * sumar el historial entero en cada consulta, y se actualiza SIEMPRE dentro de
 * la misma transaccion que crea el movimiento.
 * ============================================================================
 */
@Index(['tenant'])
@Index(['product', 'branch'], { unique: true })
@Entity({ name: 'product_stocks' })
export class ProductStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, (product) => product.stocks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  product: Product;

  @ManyToOne(() => Branch, { nullable: false, onDelete: 'CASCADE' })
  branch: Branch;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  quantity: number;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @UpdateDateColumn()
  updatedAt: Date;
}
