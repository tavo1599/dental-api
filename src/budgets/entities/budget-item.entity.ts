import { Treatment } from '../../treatments/entities/treatment.entity';
import { Product } from '../../inventory/entities/product.entity';
import { Check, Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Budget } from './budget.entity';

/**
 * Una linea del presupuesto.
 *
 * Puede ser un TRATAMIENTO del catalogo o un PRODUCTO del inventario, nunca
 * las dos cosas. Van en la misma tabla a proposito: el total, la boleta, la
 * impresion y el listado recorren una sola lista de lineas, y partirlo en dos
 * tablas obligaria a sumar y a recorrer dos sitios en cada uno de ellos.
 *
 * Las sesiones solo tienen sentido en un tratamiento; un producto se entrega y
 * ya. El seguimiento de sesiones usa innerJoin con el tratamiento, asi que las
 * lineas de producto se quedan fuera por si solas.
 */
@Check(
  'CHK_budget_item_one_kind',
  '(NOT ("treatmentId" IS NOT NULL AND "productId" IS NOT NULL))',
)
@Entity({ name: 'budget_items' })
export class BudgetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Guardamos el precio al momento de crear el presupuesto
  // para que no cambie si el precio del tratamiento se actualiza después.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtTimeOfBudget: number;

  @Column({ default: 1 })
  quantity: number;

  /**
   * Sesiones que el especialista indica para ESTE paciente.
   *
   * No sale de ningun valor del catalogo a proposito: el mismo tratamiento
   * puede hacerse en 2 sesiones para uno y en 4 para otro, asi que fijarlo
   * en el servicio solo daria trabajo de mas.
   *
   * Las sesiones YA HECHAS no se guardan aqui: se cuentan de
   * treatment_session_logs, para que no haya un contador que se desincronice.
   *
   * En una linea de producto no significa nada y se queda en 1.
   */
  @Column({ type: 'int', default: 1 })
  sessionsTotal: number;

  // Cada item pertenece a UN presupuesto
  @ManyToOne(() => Budget, (budget) => budget.items, { onDelete: 'CASCADE' })
  budget: Budget;

  /** Tratamiento del catalogo. Nulo si la linea es un producto. */
  @ManyToOne(() => Treatment, { eager: true, nullable: true })
  treatment: Treatment | null;

  /**
   * Producto del inventario. Nulo si la linea es un tratamiento.
   *
   * RESTRICT: un producto que ya figura en un presupuesto no se borra. Los
   * productos se desactivan, no se borran, asi que no estorba.
   */
  @Index()
  @ManyToOne(() => Product, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  product: Product | null;
}
