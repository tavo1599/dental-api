import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ProductStock } from './product-stock.entity';

/**
 * Categorias de producto de TODOS los rubros.
 *
 * Cada consultorio solo ve las suyas (ver CATEGORIES_BY_SPECIALTY en
 * tenants/specialty.ts): un centro de estetica no deberia elegir entre
 * "ortodoncia" y "restauracion", y hasta ahora todo le caia en "otros".
 *
 * Los valores existentes NO se tocan ni se renombran: hay productos
 * guardados con ellos.
 */
export enum ProductCategory {
  // --- Comunes a cualquier consultorio ---
  HYGIENE = 'higiene',
  DISPOSABLE = 'descartables',
  INSTRUMENT = 'instrumental',
  OTHER = 'otros',

  // --- Odontologia ---
  ORTHODONTIC = 'ortodoncia',
  RESTORATIVE = 'restauracion',

  /** Tambien en estetica: anestesia topica para laser o rellenos. */
  ANESTHETIC = 'anestesicos',

  // --- Estetica y dermatologia ---
  COSMETIC = 'cosmeticos',
  INJECTABLE = 'inyectables',
  /** Consumibles del equipo: puntas de laser, cabezales, geles conductores. */
  DEVICE_SUPPLY = 'aparatologia',

  // --- Psicologia ---
  /** Pruebas y protocolos: se gastan hoja por hoja y muchas son con licencia. */
  ASSESSMENT = 'material_evaluacion',
  /** Juegos y material para terapia infantil. */
  THERAPY_MATERIAL = 'material_terapeutico',
  OFFICE = 'papeleria',
}

export enum ProductUnit {
  UNIT = 'unidad',
  BOX = 'caja',
  PACK = 'paquete',
  ML = 'ml',
  GRAM = 'g',
}

/**
 * ============================================================================
 * PRODUCTO (catalogo)
 *
 * UNA sola tabla para lo que se vende y para lo que se consume en gabinete,
 * distinguido por dos banderas que pueden ser ambas true (un kit de
 * blanqueamiento se vende Y se usa). Separarlo en dos tablas obligaria a
 * duplicar compras, kardex, alertas de minimo y vencimiento.
 *
 * OJO: el catalogo es de la CLINICA (tenant), pero las existencias son por
 * SEDE y viven en ProductStock. El mismo producto tiene stock distinto en
 * cada sucursal.
 * ============================================================================
 */
@Index(['tenant'])
@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ProductCategory,
    default: ProductCategory.OTHER,
  })
  category: ProductCategory;

  @Column({ type: 'enum', enum: ProductUnit, default: ProductUnit.UNIT })
  unit: ProductUnit;

  // --- Venta ---
  @Column({ type: 'boolean', default: false })
  isSellable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salePrice: number;

  // --- Consumo en tratamientos ---
  @Column({ type: 'boolean', default: false })
  isConsumable: boolean;

  /** Ultimo costo de compra conocido. Sirve de referencia y para valorizar. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  /** Umbral para la alerta de stock bajo. Se compara por sede. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStock: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @OneToMany(() => ProductStock, (stock) => stock.product)
  stocks: ProductStock[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
