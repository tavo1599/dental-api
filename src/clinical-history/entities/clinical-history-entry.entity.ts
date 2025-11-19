import { Patient } from '../../patients/entities/patient.entity';
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
  evolution: string; // Evolución / SOAP

  @Column('text', { nullable: true })
  treatmentPerformed?: string;

  @Column('text', { nullable: true })
  diagnosis?: string;

  @Column('text', { nullable: true })
  prescription?: string;

  @Column('text', { nullable: true })
  indications?: string;

  @Column('text', { nullable: true, comment: 'Plan o acciones a realizar en la próxima cita' })
  nextAppointmentPlan?: string; 

  @Column({ type: 'timestamp', nullable: true, comment: 'Fecha sugerida para la próxima cita' })
  nextAppointmentDate?: Date;

  // --- CORRECCIÓN AQUÍ ---
  @ManyToOne(() => Patient, (patient) => patient.clinicalHistory, { onDelete: 'CASCADE' })
  patient: Patient;
  // --- FIN DE LA CORRECCIÓN ---

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;
}