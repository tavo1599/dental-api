import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../inventory/entities/product.entity';
import { Sale } from './sale.entity';

/**
 * Linea de una venta. Se guarda el precio del MOMENTO de la venta, igual que
 * hace BudgetItem con los tratamientos: si maniana sube el precio del producto,
 * la venta de ayer no cambia.
 */
@Entity({ name: 'sale_items' })
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  sale: Sale;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  product: Product;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;
}
