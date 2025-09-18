import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column()
  action: string; // Ej: 'CREATE_PATIENT', 'UPDATE_BUDGET_STATUS'

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  // Columna JSONB para guardar detalles extras, como el ID del recurso afectado
  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;
}