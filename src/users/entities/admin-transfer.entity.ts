import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from './user.entity';

export enum AdminTransferStatus {
  PENDING = 'pendiente',
  COMPLETED = 'completada',
  CANCELLED = 'cancelada',
}

/**
 * ============================================================================
 * TRANSFERENCIA DE TITULARIDAD DE LA CLINICA
 *
 * Cambiar quien es el administrador de una clinica no puede ser una edicion
 * mas: es entregarle el control de la cuenta a otra persona. Por eso pasa por
 * un flujo propio, con codigo de verificacion enviado al correo del titular
 * ACTUAL (quien controle ese correo es quien autoriza el cambio).
 *
 * Cada intento queda registrado aqui, completado o no: si algun dia alguien
 * discute quien entrego la cuenta y cuando, la respuesta esta en esta tabla.
 *
 * El codigo se guarda HASHEADO, igual que el de recuperar contrasena: quien
 * tenga acceso a la base no debe poder usarlo para quedarse con una clinica.
 * ============================================================================
 */
@Index(['tenant'])
@Entity({ name: 'admin_transfers' })
export class AdminTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  /** Titular que entrega la cuenta. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  fromUser: User | null;

  /** Usuario que la recibe. */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  toUser: User | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  codeHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({
    type: 'enum',
    enum: AdminTransferStatus,
    default: AdminTransferStatus.PENDING,
  })
  status: AdminTransferStatus;

  /** Intentos fallidos de código, para cortar la fuerza bruta. */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** true cuando la ejecuto el super admin en lugar del propio titular. */
  @Column({ type: 'boolean', default: false })
  forcedBySuperAdmin: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
