import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

/**
 * ============================================================================
 * SUCURSAL (SEDE)
 *
 * Una clinica (Tenant) puede tener varias sedes. OJO con la jerarquia:
 *
 *   Tenant  -> sigue siendo la FRONTERA DE SEGURIDAD. Nada cruza de un tenant
 *              a otro, nunca.
 *   Branch  -> es un FILTRO dentro del tenant. Separa la operacion diaria
 *              (citas, caja, stock) pero comparte lo clinico (pacientes,
 *              historia, odontograma) porque un paciente puede atenderse en
 *              cualquier sede y el doctor necesita ver su historia completa.
 *
 * Toda clinica tiene al menos una sede (isMain). Las clinicas que no usan
 * sucursales simplemente trabajan siempre sobre su sede principal y no notan
 * ninguna diferencia.
 * ============================================================================
 */
@Entity({ name: 'branches' })
@Index(['tenant'])
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Ej: "Sede Juliaca Centro"

  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null; // Codigo corto opcional, ej: "JUL-01"

  /** La sede principal de la clinica. Siempre existe una. */
  @Column({ type: 'boolean', default: false })
  isMain: boolean;

  /** Una sede desactivada no aparece para operar, pero su historico se conserva. */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  // Mismo formato de texto plano que usa Patient (ubigeos del Peru).
  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  province: string | null;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  /**
   * Admin de esta sucursal. Al ser UNA columna, es estructuralmente imposible
   * que una sede tenga dos admins: no hace falta validarlo en codigo.
   * SET NULL: si se elimina al usuario, la sede queda sin admin en vez de
   * bloquear el borrado.
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  admin: User | null;

  /** Doctores y asistentes con acceso a esta sede (un usuario puede rotar). */
  @ManyToMany(() => User, (user) => user.branches)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
