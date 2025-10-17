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

  @Column({ type: 'varchar', length: 10, nullable: true })
  bloodPressure: string; // Presión Arterial (ej. "120/80")

  @Column({ type: 'int', nullable: true })
  heartRate: number; // Frecuencia Cardíaca (ej. 80)

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number; // Temperatura (ej. 36.5)

  @Column({ type: 'int', nullable: true })
  respiratoryRate: number; // Frecuencia Respiratoria (ej. 16)

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => User)
  user: User; // El usuario (doctor) que crea la entrada

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}