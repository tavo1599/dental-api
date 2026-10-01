import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Treatment } from '../../treatments/entities/treatment.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * ============================================================================
 * INSUMOS QUE CONSUME UN TRATAMIENTO
 *
 * La "receta" de cada tratamiento: que se gasta y cuanto. La clinica la llena
 * UNA vez por tratamiento y a partir de ahi el stock baja solo cada vez que se
 * registra una sesion.
 *
 *   Depilacion laser axilas
 *     guantes de nitrilo .... 1 par
 *     gel conductor ......... 5 ml
 *     gasas ................. 2 unidades
 *
 * Solo tiene sentido con productos marcados como insumo (isConsumable): lo que
 * se vende al paciente sale por la via de ventas, no por aqui.
 *
 * Es OPCIONAL: un tratamiento sin receta no consume nada y todo sigue como
 * antes. No se obliga a nadie a cargar esto para poder trabajar.
 * ============================================================================
 */
@Index(['tenant'])
@Unique('UQ_treatment_supply', ['treatment', 'product'])
@Entity({ name: 'treatment_supplies' })
export class TreatmentSupply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Treatment, { nullable: false, onDelete: 'CASCADE' })
  treatment: Treatment;

  /**
   * RESTRICT y no CASCADE a proposito: si alguien intenta borrar un producto
   * que forma parte de una receta, es mejor que la base lo impida y se avise,
   * en lugar de dejar recetas incompletas sin que nadie se entere.
   */
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  product: Product;

  /**
   * Cuanto se gasta por sesion. Decimal porque hay insumos que se miden en ml
   * o gramos: "0.5 ml de anestesico" es perfectamente normal.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;
}
