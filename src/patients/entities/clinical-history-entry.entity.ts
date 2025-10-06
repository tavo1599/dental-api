import { Patient } from './patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'clinical_history_entries' })
export class ClinicalHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  entryDate: Date;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  treatmentPerformed?: string;

  @Column('text', { nullable: true })
  diagnosis?: string;

  @Column('text', { nullable: true })
  prescription?: string;

  @Column('text', { nullable: true })
  indications?: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => User)
  user: User; // El usuario (doctor) que crea la entrada

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}