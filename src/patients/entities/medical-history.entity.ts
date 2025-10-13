import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity({ name: 'medical_histories' })
export class MedicalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true, comment: 'Motivo principal de la consulta' })
  mainComplaint: string;

  @Column({ type: 'boolean', default: false, comment: '¿Está en tratamiento médico?' })
  isUnderMedicalTreatment: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Descripción del tratamiento médico' })
  medicalTreatmentDescription: string;

  @Column({ type: 'text', nullable: true, comment: 'Medicamentos que toma actualmente' })
  currentMedications: string;

  @Column({ type: 'text', nullable: true, comment: 'Enfermedades como Hipertensión, Diabetes, etc.' })
  systemicDiseases: string;

  @Column({ type: 'boolean', default: false, comment: '¿Problemas de coagulación o hemorragias?' })
  hasBleedingIssues: boolean;

  @Column({ type: 'boolean', nullable: true, comment: '¿Está embarazada?' })
  isPregnant: boolean | null;

  @Column({ type: 'date', nullable: true, comment: 'Fecha de la última visita al dentista' })
  lastDentalVisit: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Motivo de la última visita' })
  reasonForLastVisit: string;

  @OneToOne(() => Patient, patient => patient.medicalHistory)
  @JoinColumn()
  patient: Patient;
}