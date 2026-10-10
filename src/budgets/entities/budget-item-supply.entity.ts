import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from '../../inventory/entities/product.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { BudgetItem } from './budget-item.entity';

/**
 * ============================================================================
 * INSUMOS DE UNA LINEA DEL PRESUPUESTO
 *
 * Lo que de verdad se va a gastar en ESTE tratamiento para ESTE paciente.
 *
 * El tratamiento ya tiene una receta en el catalogo (treatment_supplies), pero
 * esa es la de siempre: un paciente puede necesitar el doble de anestesia, u
 * otra crema, y eso no debe cambiar la receta para todos los demas. Asi que al
 * armar el presupuesto se parte de la receta y lo que el especialista ajuste
 * se guarda AQUI, pegado a su linea.
 *
 * Si una linea no tiene nada aqui, se usa la receta del catalogo tal cual. Es
 * la diferencia entre "no toque nada" y "para este paciente va esto".
 * ============================================================================
 */
@Index(['budgetItem'])
// Un mismo insumo dos veces en la misma linea es un error de la interfaz: las
// cantidades se suman en una sola linea.
@Unique(['budgetItem', 'product'])
@Entity({ name: 'budget_item_supplies' })
export class BudgetItemSupply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BudgetItem, (item) => item.supplies, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  budgetItem: BudgetItem;

  /**
   * RESTRICT y no CASCADE a proposito: si alguien intenta borrar un producto
   * que figura en un presupuesto, la base lo frena. Los productos se
   * desactivan, no se borran.
   */
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  product: Product;

  /**
   * Decimal porque muchos insumos se miden en mililitros o gramos: "0.5 ml de
   * anestesico" es perfectamente normal.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;
}
