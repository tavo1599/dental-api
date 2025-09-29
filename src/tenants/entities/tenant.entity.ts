import { Column, Entity, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  schema: string;

    // --- CAMPOS PARA PLANES DE SUSCRIPCIÓN ---
  @Column({ default: 'profesional' })
  plan: string; // ej. 'basico', 'profesional', 'premium'

  @Column({ type: 'int', default: 10 })
  maxUsers: number; // Límite de usuarios según el plan
  // --- FIN ---

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ type: 'date', nullable: true })
  subscriptionStartDate: Date | null;

  @Column({ type: 'date', nullable: true })
  nextPaymentDate: Date | null;

  // --- CAMPOS PARA LA INTEGRACIÓN CON GOOGLE ---
  @Column({ type: 'text', nullable: true })
  googleAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleRefreshToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleCalendarId: string | null; // El ID del calendario a usar (ej. 'primary')
  // --- FIN ---

  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => Patient, patient => patient.tenant)
  patients: Patient[];

  @CreateDateColumn()
  createdAt: Date;
}