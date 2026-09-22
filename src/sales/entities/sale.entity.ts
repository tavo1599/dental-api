import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';

export enum SaleStatus {
  COMPLETED = 'completada',
  CANCELLED = 'anulada',
}

/**
 * ============================================================================
 * VENTA DE PRODUCTOS
 *
 * Se vende a un paciente registrado O a publico general (customerName). Por
 * eso `patient` es opcional: no obligamos a dar de alta como paciente a quien
 * solo pasa a comprar un cepillo.
 *
 * `number` es el correlativo visible del comprobante, unico POR SEDE: cada
 * sucursal lleva su propia numeracion, como en la practica real.
 * ============================================================================
 */
@Index(['tenant', 'branch'])
@Index(['branch', 'number'], { unique: true })
@Entity({ name: 'sales' })
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  number: number;

  // --- Cliente: paciente registrado o publico general ---
  @ManyToOne(() => Patient, { nullable: true, onDelete: 'SET NULL' })
  patient: Patient | null;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerDocument: string | null;

  // --- Importes ---
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @ManyToOne(() => User, { nullable: true })
  soldBy: User | null;

  @ManyToOne(() => Branch, { nullable: false, onDelete: 'RESTRICT' })
  branch: Branch;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;
}
