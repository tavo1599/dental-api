// En: src/patients/entities/orthodontic-history.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

// --- Interfaces para tipar nuestros campos JSONB ---
// (Basadas 100% en tu PDF)

// PDF Sección 1: ANÁLISIS GENERAL [cite: 6]
export interface IOrthoGeneralAnalysis {
  mainComplaint: string | null; // [cite: 14]
  medicalHistory: string | null; // [cite: 15]
  traumaHistory: string | null; // [cite: 16]
  previousTreatment: { // [cite: 17]
    hasPrevious: boolean | null; // [cite: 17, 18]
    comments: string | null; // [cite: 21]
  };
  collaborationIndex: 'alto' | 'medio' | 'bajo' | null; // [cite: 27, 33, 36]
  oralHygiene: 'adecuada' | 'deficiente' | null; // [cite: 29, 37]
  needsGeneralTreatment: string | null; // [cite: 38]
}

// PDF Sección 2: ANÁLISIS FACIAL 
export interface IOrthoFacialAnalysis {
  facialType: 'mesofacial' | 'dolicofacial' | 'braquifacial' | null; // [cite: 42, 43, 45]
  convexity: 'recto' | 'concavo' | 'convexo' | null; // [cite: 47, 48, 50]
  facialThirds: { // [cite: 51]
    proportional: boolean | null; // [cite: 53]
    upperAugmented: boolean | null; // [cite: 54, 60]
    middleAugmented: boolean | null; // [cite: 54, 62]
    lowerAugmented: boolean | null; // [cite: 54, 61]
    upperDiminished: boolean | null; // [cite: 55, 60]
    middleDiminished: boolean | null; // [cite: 55, 62]
    lowerDiminished: boolean | null; // [cite: 55, 61]
  };
  lipSeal: boolean | null; // [cite: 64, 65]
  restSymmetry: { // [cite: 58]
    isSymmetric: boolean | null; // [cite: 69, 73]
    deviation: 'derecha' | 'izquierda' | null; // [cite: 71, 74]
  };
  openingSymmetry: { // [cite: 77]
    isSymmetric: boolean | null; // [cite: 78, 79]
    deviation: 'derecha' | 'izquierda' | null; // [cite: 83]
  };
  nasolabialAngle: 'normal' | 'abierto' | 'disminuido' | null; // [cite: 85, 87, 89]
  mentolabialAngle: 'normal' | 'profundo' | 'poco profundo' | null; // [cite: 91, 93, 105]
  zygomaticProjection: 'normal' | 'aumentada' | 'deficiente' | null; // [cite: 95, 96, 106]
  chinNeckLine: 'normal' | 'aumentada' | 'disminuida' | null; // [cite: 100, 101, 102]
  chinNeckAngle: 'normal' | 'abierto' | 'cerrado' | null; // [cite: 110, 111, 112, 113]
  facialPattern: { // [cite: 114]
    pattern: 'I' | 'II' | 'III' | 'cara corta' | 'cara larga' | null; // [cite: 117, 120, 123, 129, 130]
    details: string[]; // ej: ['protrusion_maxilar', 'retrusion_mandibular'] [cite: 121, 122, 124, 128]
  };
}

// Tipo para relaciones Caninas/Molares
type SagittalRelation = 'claseI' | 'claseII' | 'claseIII' | 'mediaClaseII' | 'tresCuartosClaseII' | 'completaClaseII' | 'mediaClaseIII' | 'tresCuartosClaseIII' | 'completaClaseIII' | null; // [cite: 187-225]

// PDF Sección 3: ANÁLISIS OCLUSAL 
export interface IOrthoOcclusalAnalysis {
  manipulation: 'rc_mih_igual' | 'rc_mih_diferente' | null; // [cite: 139, 141]
  transversal: { // [cite: 142]
    relation: 'brodie' | 'normal' | 'cruzada_unilateral' | 'cruzada_bilateral' | null; // [cite: 144, 145, 147, 148]
    crossbiteFeatures: 'esqueletal' | 'dentoalveolar' | 'no_presenta' | null; // [cite: 150, 151, 152]
  };
  vertical: { // [cite: 153]
    relation: 'normal' | 'bis_a_bis' | 'mordida_profunda' | 'mordida_abierta' | null; // [cite: 156, 157, 158, 162]
    amount: string | null; // (para registrar mm o piezas de profunda/abierta) [cite: 158, 162]
  };
  speeCurve: { // [cite: 163]
    isAltered: boolean | null; // [cite: 164, 166]
    details: string[]; // ej: ['extrusion_incisivos_inf'] [cite: 168, 170, 172, 173, 174]
  };
  sagittalIncisors: 'normal' | 'overjet_aumentado' | 'mordida_cruzada_anterior' | null; // [cite: 177, 180, 181, 182]
  mihCanineRelation: { // 
    right: SagittalRelation;
    left: SagittalRelation;
  };
  mihMolarRelation: { // [cite: 203]
    right: SagittalRelation;
    left: SagittalRelation;
  };
  rcCanineRelation: { // [cite: 232]
    right: SagittalRelation;
    left: SagittalRelation;
  };
  rcMolarRelation: { // [cite: 245]
    right: SagittalRelation;
    left: SagittalRelation;
  };
  midline: { // [cite: 274]
    coincident: boolean | null; // [cite: 276]
    upperDeviation: 'derecha' | 'izquierda' | null; // [cite: 277]
    lowerDeviation: 'derecha' | 'izquierda' | null; // [cite: 278]
  };
  dentalAnomalies: string | null; // [cite: 280]
  atmCondition: string | null; // [cite: 281]
  familyMalocclusion: string | null; // [cite: 283]
}

// PDF Sección 5: DIAGNOSTICO FUNCIONAL [cite: 287]
export interface IOrthoFunctionalAnalysis {
  respirationType: string | null; // [cite: 288]
  // (El PDF no muestra más, pero se puede expandir fácil)
}


// --- LA ENTIDAD PRINCIPAL ---
@Entity({ name: 'orthodontic_histories' })
export class OrthodonticHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Relación con Paciente (igual a tus otras entidades) ---
  @OneToOne(() => Patient, patient => patient.orthodonticHistory)
  @JoinColumn()
  patient: Patient;

  // --- Secciones JSONB ---
  @Column('jsonb', { nullable: true })
  generalAnalysis: IOrthoGeneralAnalysis; // [cite: 6]

  @Column('jsonb', { nullable: true })
  facialAnalysis: IOrthoFacialAnalysis; // 

  @Column('jsonb', { nullable: true })
  occlusalAnalysis: IOrthoOcclusalAnalysis; // 

  @Column('jsonb', { nullable: true })
  functionalAnalysis: IOrthoFunctionalAnalysis; // [cite: 287]

  @Column('text', { nullable: true, comment: 'Viene del PDF Sección 4' }) // [cite: 285]
  cephalometricAnalysis: string; // (Suele ser un resumen o texto) [cite: 285]

  // (Campos extra para el plan de tratamiento, etc.)
  @Column('text', { nullable: true })
  diagnosis: string;

  @Column('text', { nullable: true })
  treatmentPlan: string;
}