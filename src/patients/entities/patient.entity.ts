import { Tenant } from '../../tenants/entities/tenant.entity';
import { MedicalHistory } from './medical-history.entity';
import { ClinicalHistoryEntry } from '../../clinical-history/entities/clinical-history-entry.entity'; // <-- Importa la entidad que faltaba
import { Appointment } from '../../appointments/entities/appointment.entity'; // <-- Importa la entidad Appointment
import { OdontopediatricHistory } from './odontopediatric-history.entity';
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, Unique } from 'typeorm';
import { OrthodonticHistory } from './orthodontic-history.entity';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity({ name: 'patients' })
@Unique(['dni', 'tenant'])
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column()
  dni: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;
  
  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  occupation?: string;

  @Column({ nullable: true })
  emergencyContactName?: string;

  @Column({ nullable: true })
  emergencyContactPhone?: string;

  @Column('text', { nullable: true })
  allergies?: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  province?: string;

  @Column({ nullable: true })
  district?: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column('text', { nullable: true })
  relevantMedicalHistory?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fileCode: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  // --- RELACIONES ---

  // La anamnesis (se llena una vez)
  @OneToOne(() => MedicalHistory, (medicalHistory) => medicalHistory.patient, { cascade: true })
  medicalHistory: MedicalHistory;

  @OneToOne(() => OdontopediatricHistory, history => history.patient, { cascade: true })
  odontopediatricHistory: OdontopediatricHistory;

  @OneToOne(() => OrthodonticHistory, history => history.patient, { cascade: true })
  orthodonticHistory: OrthodonticHistory;

  // Las entradas de historial (se añaden en cada cita)
  @OneToMany(() => ClinicalHistoryEntry, (entry) => entry.patient)
  clinicalHistory: ClinicalHistoryEntry[];

  // Las citas del paciente
  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];
}