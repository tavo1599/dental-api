import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum CollaborationIndex {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// --- NUEVO ENUM AÑADIDO (del PDF 1.12) ---
export enum OralHygiene {
  ADEQUATE = 'adequate',
  DEFICIENT = 'deficient',
}

export enum FacialType {
  MESOFACIAL = 'mesofacial',
  DOLICOFACIAL = 'dolicofacial',
  BRAQUIFACIAL = 'braquifacial',
}

export enum Convexity {
  RECTO = 'recto',
  CONCAVO = 'concavo',
  CONVEXO = 'convexo',
}

export enum NasolabialAngle {
  NORMAL = 'normal',
  OPEN = 'open',
  REDUCED = 'reduced',
}

export enum MentolabialAngle {
  NORMAL = 'normal',
  DEEP = 'deep',
  SHALLOW = 'shallow',
}

export enum ZygomaticProjection {
  NORMAL = 'normal',
  INCREASED = 'increased',
  DEFICIENT = 'deficient',
}

export enum ChinNeckLine {
  NORMAL = 'normal',
  INCREASED = 'increased',
  DECREASED = 'decreased',
}

export enum ChinNeckAngle {
  NORMAL = 'normal',
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum FacialPattern {
  PATTERN_1 = 'pattern_1',
  PATTERN_2 = 'pattern_2',
  PATTERN_3 = 'pattern_3',
  MANDIBULAR_RETRUSION = 'mandibular_retrusion',
  MAXILLARY_PROTRUSION = 'maxillary_protrusion',
  SHORT_FACE = 'short_face',
  LONG_FACE = 'long_face',
}

export enum DentalTransverseRelation {
  BRODIE = 'brodie',
  NORMAL = 'normal',
  BILATERAL_POSTERIOR_CROSSBITE = 'bilateral_posterior_crossbite',
  UNILATERAL_POSTERIOR_CROSSBITE_RIGHT = 'unilateral_posterior_crossbite_right',
  UNILATERAL_POSTERIOR_CROSSBITE_LEFT = 'unilateral_posterior_crossbite_left',
}

export enum CrossbiteCharacteristic {
  SKELETAL = 'skeletal',
  DENTO_ALVEOLAR = 'dento_alveolar',
  NONE = 'none',
}

export enum VerticalRelation {
  NORMAL = 'normal',
  EDGE_TO_EDGE = 'edge_to_edge',
  DEEP_BITE = 'deep_bite',
  OPEN_BITE = 'open_bite',
}

@Entity({ name: 'orthodontic_anamneses' })
export class OrthodonticAnamnesis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  creationDate: Date;

  // Relación con paciente / tenant / usuario
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @ManyToOne(() => User)
  user: User;

  // --- 1. ANAMNESIS / ANÁLISIS GENERAL (Corregido) ---
  
  @Column('text', { nullable: true, comment: 'Queja principal- ¿Porqué busca tratamiento?' })
  mainComplaint: string; // <-- AÑADIDO (PDF 1.7)

  @Column('text', { nullable: true, comment: 'Historia médica / medicación de uso contínuo' })
  medicalHistory: string; // <-- AÑADIDO (PDF 1.8)

  @Column('text', { nullable: true, comment: 'Antecedentes de accidentes o traumas' })
  traumaHistory: string; // <-- AÑADIDO (PDF 1.9)
  
  @Column({ type: 'boolean', default: false })
  previousOrthodonticTreatment: boolean;

  @Column('text', { nullable: true })
  previousOrthodonticTreatmentDetails?: string;

  @Column({ type: 'enum', enum: CollaborationIndex, nullable: true })
  collaborationIndex?: CollaborationIndex;

  @Column({ type: 'enum', enum: OralHygiene, nullable: true })
  oralHygiene?: OralHygiene; // <-- AÑADIDO (PDF 1.12)

  @Column({ type: 'boolean', default: false })
  needsGeneralTreatment: boolean;

  @Column('text', { nullable: true })
  needsGeneralTreatmentDetails?: string;

  // --- 2. ANALISIS FACIAL ---
  @Column({ type: 'enum', enum: FacialType, nullable: true })
  facialType?: FacialType;

  @Column({ type: 'enum', enum: Convexity, nullable: true })
  convexity?: Convexity;

  @Column('text', { nullable: true })
  proportionThirds?: string;

  @Column({ type: 'boolean', default: false })
  labialSeal: boolean;

  @Column('text', { nullable: true })
  facialSymmetryAtRest?: string;

  @Column('text', { nullable: true })
  facialSymmetryOnMouthOpening?: string;

  @Column({ type: 'enum', enum: NasolabialAngle, nullable: true })
  nasolabialAngle?: NasolabialAngle;

  @Column({ type: 'enum', enum: MentolabialAngle, nullable: true })
  mentolabialAngle?: MentolabialAngle;

  @Column({ type: 'enum', enum: ZygomaticProjection, nullable: true })
  zygomaticProjection?: ZygomaticProjection;

  @Column({ type: 'enum', enum: ChinNeckLine, nullable: true })
  chinNeckLine?: ChinNeckLine;

  @Column({ type: 'enum', enum: ChinNeckAngle, nullable: true })
  chinNeckAngle?: ChinNeckAngle;

  @Column({ type: 'enum', enum: FacialPattern, nullable: true })
  facialPattern?: FacialPattern;

  // --- 3. ANALISIS OCLUSAL ---
  @Column('text', { nullable: true })
  occlusionOnManipulation?: string;

  @Column({ type: 'enum', enum: DentalTransverseRelation, nullable: true })
  dentalTransverseRelation?: DentalTransverseRelation;

  @Column({ type: 'enum', enum: CrossbiteCharacteristic, nullable: true })
  crossbiteCharacteristic?: CrossbiteCharacteristic;

  @Column({ type: 'enum', enum: VerticalRelation, nullable: true })
  verticalRelation?: VerticalRelation;

  @Column('text', { nullable: true })
  speeCurve?: string;

  @Column('text', { nullable: true })
  incisorSagittalRelation?: string;

  @Column('text', { nullable: true })
  canineRelationRight?: string;

  @Column('text', { nullable: true })
  canineRelationLeft?: string;

  @Column('text', { nullable: true })
  molarRelationRight?: string;

  @Column('text', { nullable: true })
  molarRelationLeft?: string;

  @Column('text', { nullable: true })
  centricRelation?: string;

  @Column('text', { nullable: true })
  midline?: string;

  @Column('text', { nullable: true })
  dentalAnomalies?: string;

  @Column('text', { nullable: true })
  tmjCondition?: string;

  @Column({ type: 'boolean', default: false })
  familyWithSameMalocclusion: boolean;

  @Column('text', { nullable: true })
  familyMemberDetail?: string;

  // --- 4. ANALISIS CEFALOMETRICO ---
  @Column('text', { nullable: true })
  cephalometricAnalysis?: string;

  // --- 5. DIAGNOSTICO FUNCIONAL ---
  @Column('text', { nullable: true })
  functionalDiagnoses?: string;
}