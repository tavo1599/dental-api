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

  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => Patient, patient => patient.tenant)
  patients: Patient[];

  @CreateDateColumn()
  createdAt: Date;
}