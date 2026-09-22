import {
  Column,
  CreateDateColumn,
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
 * LOTE DE UN PRODUCTO EN UNA SEDE
 *
 * El vencimiento NO puede ser un campo del producto: la misma resina se compra
 * varias veces y cada compra trae su lote con su fecha. Por eso las existencias
 * se desglosan en lotes.
 *
 *   ProductStock -> cuanto hay en total en la sede (rapido, para listados)
 *   ProductLot   -> de que lotes se compone ese total y cuando vence cada uno
 *
 * Las salidas se descargan por FEFO (First Expired, First Out): sale primero lo
 * que antes caduca. Es lo que evita que un lote se venza en el cajon mientras
 * se consume otro mas nuevo.
 *
 * lotNumber y expiryDate son opcionales: un cepillo de dientes no caduca. Esos
 * lotes se ordenan al final (NULLS LAST) para que nunca desplacen a uno que si
 * tiene fecha.
 * ============================================================================
 */
@Index(['tenant'])
@Index(['product', 'branch'])
@Entity({ name: 'product_lots' })
export class ProductLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  product: Product;

  @ManyToOne(() => Branch, { nullable: false, onDelete: 'CASCADE' })
  branch: Branch;

  /** Codigo de lote del fabricante. Null cuando el producto no lo maneja. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  lotNumber: string | null;

  /**
   * Null = el producto no caduca (un cepillo, unas pinzas...).
   *
   * Se tipa como string 'YYYY-MM-DD' a proposito: una columna `date` no tiene
   * hora ni zona. Convertirla a Date la interpreta como medianoche UTC y, con
   * la zona de Peru (UTC-5), la fecha retrocede un dia. En un vencimiento
   * clinico ese desfase no es admisible.
   */
  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  quantity: number;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
