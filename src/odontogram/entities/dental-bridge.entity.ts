import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'dental_bridges' })
export class DentalBridge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  startTooth: number;

  @Column()
  endTooth: number;

  @Column({ default: 'fixed' })
  type: string; // 'fixed'

  @Column({ default: 'red' })
  color: string; // 'red', 'blue'

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;
}