import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

/**
 * ============================================================================
 * ANAMNESIS PSICOLOGICA
 *
 * Lo PROPIO de un consultorio de psicologia. Todo lo clinico comun -motivo de
 * consulta, antecedentes familiares y personales, medicacion, alergias,
 * funciones biologicas, signos vitales- ya esta en medical_histories y se usa
 * igual en los tres rubros. Aqui solo va lo que no cabe alli, igual que
 * orthodontic_histories guarda lo propio de ortodoncia.
 *
 * Sobre el bloque de riesgo: se guarda porque en psicologia es parte del
 * estandar de una primera entrevista y omitirlo seria peor que incluirlo. Son
 * datos especialmente sensibles y por eso solo los ve quien atiende a ese
 * paciente, con las mismas reglas de acceso que el resto de la historia.
 * ============================================================================
 */
@Entity({ name: 'psychology_histories' })
export class PsychologyHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- 1. Antecedentes de atencion psicologica ---
  @Column({ type: 'boolean', default: false, comment: '¿Ha recibido atención psicológica antes?' })
  hadPreviousTherapy: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Dónde, cuándo y por cuánto tiempo' })
  previousTherapyDetails: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Diagnósticos psicológicos o psiquiátricos previos' })
  previousDiagnoses: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Medicación psiquiátrica actual y quién la indicó' })
  psychiatricMedication: string | null;

  @Column({ type: 'boolean', default: false, comment: '¿Ha estado hospitalizado por salud mental?' })
  hadPsychiatricHospitalization: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Antecedentes de salud mental en la familia' })
  familyMentalHealthHistory: string | null;

  // --- 2. Situacion actual ---
  @Column({ type: 'text', nullable: true, comment: 'Situación laboral o de estudios' })
  occupationalSituation: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Con quién vive y cómo es su red de apoyo' })
  supportNetwork: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Situaciones estresantes actuales' })
  currentStressors: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Calidad del sueño y horarios' })
  sleepPattern: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Consumo de alcohol, tabaco u otras sustancias' })
  substanceUse: string | null;

  // --- 3. Evaluacion de riesgo ---
  @Column({ type: 'boolean', default: false, comment: '¿Presenta ideación suicida?' })
  hasSuicidalIdeation: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Hay intentos previos?' })
  hasPreviousAttempts: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Presenta conductas autolesivas?' })
  hasSelfHarm: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Detalle de la evaluación de riesgo y plan de seguridad' })
  riskNotes: string | null;

  // --- 4. Plan ---
  @Column({ type: 'text', nullable: true, comment: 'Qué espera el paciente del proceso' })
  expectations: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Impresión diagnóstica y plan de trabajo' })
  treatmentPlan: string | null;

  @OneToOne(() => Patient, (patient) => patient.psychologyHistory)
  @JoinColumn()
  patient: Patient;
}
