import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

/**
 * ============================================================================
 * ANAMNESIS ESTETICA / DERMATOLOGICA
 *
 * Lo PROPIO de un centro estetico. Lo clinico comun -antecedentes, medicacion,
 * alergias, embarazo, signos vitales- ya esta en medical_histories y sirve
 * igual para los tres rubros; aqui solo va lo que no cabe alli.
 *
 * Buena parte de estos campos son CONTRAINDICACIONES: la tendencia a queloides,
 * el herpes labial recurrente, el uso de isotretinoina o el bronceado reciente
 * desaconsejan procedimientos concretos. Por eso son booleanos y no texto
 * libre: asi se pueden ver de un vistazo antes de empezar.
 * ============================================================================
 */
@Entity({ name: 'aesthetic_histories' })
export class AestheticHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- 1. Piel ---
  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
    comment: 'Fototipo de Fitzpatrick (I a VI)',
  })
  skinPhototype: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Tipo de piel: grasa, seca, mixta, sensible' })
  skinType: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Afecciones actuales: acné, rosácea, melasma...' })
  currentConditions: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Rutina de cuidado que sigue hoy' })
  currentSkincare: string | null;

  // --- 2. Antecedentes de procedimientos ---
  @Column({ type: 'text', nullable: true, comment: 'Tratamientos estéticos previos y cuándo' })
  previousTreatments: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Rellenos, toxina botulínica o implantes, y zonas' })
  previousFillers: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Cirugías estéticas previas' })
  previousSurgeries: string | null;

  // --- 3. Contraindicaciones ---
  @Column({ type: 'boolean', default: false, comment: '¿Tendencia a queloides o cicatrización anómala?' })
  keloidTendency: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Herpes labial recurrente?' })
  recurrentHerpes: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Usa isotretinoína o la usó en los últimos 6 meses?' })
  usesIsotretinoin: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Usa retinoides o ácidos tópicos?' })
  usesRetinoids: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Exposición solar intensa o bronceado reciente?' })
  recentSunExposure: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Usa protector solar a diario?' })
  usesSunscreen: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Marcapasos o implantes metálicos? (radiofrecuencia)' })
  hasMetalImplants: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Otras contraindicaciones a tener en cuenta' })
  otherContraindications: string | null;

  // --- 4. Plan ---
  @Column({ type: 'text', nullable: true, comment: 'Zonas a tratar y qué espera el paciente' })
  expectations: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Plan de tratamiento propuesto' })
  treatmentPlan: string | null;

  @OneToOne(() => Patient, (patient) => patient.aestheticHistory)
  @JoinColumn()
  patient: Patient;
}
