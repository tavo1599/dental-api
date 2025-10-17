import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity({ name: 'medical_histories' })
export class MedicalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- 1. Enfermedad Actual ---
  @Column({ type: 'text', nullable: true, comment: 'Motivo principal de la consulta' })
  mainComplaint: string;

  @Column({ type: 'text', nullable: true, comment: 'Relato cronológico y síntomas' })
  illnessHistory: string;

  @Column({ type: 'text', nullable: true, comment: 'Funciones biológicas (apetito, sueño, etc.)' })
  biologicalFunctions: string;

  // --- 2. Antecedentes ---
  @Column({ type: 'text', nullable: true, comment: 'Antecedentes familiares relevantes' })
  familyHistory: string;
  
  @Column({ type: 'text', nullable: true, comment: 'Antecedentes personales relevantes' })
  personalHistory: string;

  @Column({ type: 'text', nullable: true, comment: 'Medicamentos que toma permanentemente' })
  currentMedications: string;

  @Column({ type: 'text', nullable: true, comment: 'Reacciones alérgicas (Penicilina, AINES, etc.)' })
  allergies: string; // Movido aquí desde Paciente para centralizar

  @Column({ type: 'text', nullable: true, comment: 'Reacciones previas a la anestesia dental' })
  anesthesiaReaction: string;

  @Column({ type: 'boolean', default: false, comment: '¿Problemas de coagulación o hemorragias?' })
  hasBleedingIssues: boolean;

  @Column({ type: 'boolean', nullable: true, comment: '¿Está embarazada?' })
  isPregnant: boolean | null;

  @Column({ type: 'boolean', nullable: true, comment: '¿Está dando de lactar?' })
  isLactating: boolean | null;

  // --- 3. Checklist de Enfermedades (JSON) ---
  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Checklist de enfermedades (ej: { diabetes: true, hipertension: false })' 
  })
  medicalChecklist: Record<string, boolean>;

  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Detalles para campos que requieren "especificar"' 
  })
  medicalChecklistDetails: Record<string, string>;

  // --- 4. Historial Dental (Paciente) ---
  @Column({ type: 'date', nullable: true, comment: 'Fecha de la última visita al dentista' })
  lastDentalVisit: Date | null;

  @Column({ type: 'integer', nullable: true, comment: 'Veces que se cepilla al día' })
  brushingFrequency: number;

  @Column({ type: 'boolean', default: false, comment: '¿Usa hilo dental?' })
  usesFloss: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Sufre de bruxismo (aprieta los dientes)?' })
  bruxism: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Otras molestias en la boca' })
  oralDiscomfort: string;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: 'Presión Arterial (ej. 120/80)' })
  bloodPressure: string;

  @Column({ type: 'int', nullable: true, comment: 'Frecuencia Cardíaca (ej. 80)' })
  heartRate: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true, comment: 'Temperatura (ej. 36.5)' })
  temperature: number;

  @Column({ type: 'int', nullable: true, comment: 'Frecuencia Respiratoria (ej. 16)' })
  respiratoryRate: number;

  @OneToOne(() => Patient, patient => patient.medicalHistory)
  @JoinColumn()
  patient: Patient;
}