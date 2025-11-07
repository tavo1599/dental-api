// En: src/patients/dto/update-orthodontic-history.dto.ts

import { Type } from 'class-transformer';
import { 
  IsString, 
  IsBoolean, 
  IsEnum, 
  IsOptional, 
  ValidateNested, 
  IsObject, 
  IsArray
} from 'class-validator';

// --- Enums para validación (basados en el PDF) ---

enum CollaborationIndex {
  ALTO = 'alto',
  MEDIO = 'medio',
  BAJO = 'bajo',
}

enum OralHygiene {
  ADECUADA = 'adecuada',
  DEFICIENTE = 'deficiente',
}

enum FacialType {
  MESOFACIAL = 'mesofacial',
  DOLICOFACIAL = 'dolicofacial',
  BRAQUIFACIAL = 'braquifacial',
}

enum Convexity {
  RECTO = 'recto',
  CONCAVO = 'concavo',
  CONVEXO = 'convexo',
}

enum SymmetryDeviation {
  DERECHA = 'derecha',
  IZQUIERDA = 'izquierda',
}

enum NasolabialAngle {
  NORMAL = 'normal',
  ABIERTO = 'abierto',
  DISMINUIDO = 'disminuido',
}

enum MentolabialAngle {
  NORMAL = 'normal',
  PROFUNDO = 'profundo',
  POCO_PROFUNDO = 'poco profundo',
}

enum ZygomaticProjection {
  NORMAL = 'normal',
  AUMENTADA = 'aumentada',
  DEFICIENTE = 'deficiente',
}

enum ChinNeckLine {
  NORMAL = 'normal',
  AUMENTADA = 'aumentada',
  DISMINUIDA = 'disminuida',
}

enum ChinNeckAngle {
  NORMAL = 'normal',
  ABIERTO = 'abierto',
  CERRADO = 'cerrado',
}

enum FacialPattern {
  I = 'I',
  II = 'II',
  III = 'III',
  CARA_CORTA = 'cara corta',
  CARA_LARGA = 'cara larga',
}

enum RCRelation {
  IGUAL = 'rc_mih_igual',
  DIFERENTE = 'rc_mih_diferente',
}

enum TransversalRelation {
  BRODIE = 'brodie',
  NORMAL = 'normal',
  CRUZADA_UNILATERAL = 'cruzada_unilateral',
  CRUZADA_BILATERAL = 'cruzada_bilateral',
}

enum CrossbiteFeatures {
  ESQUELETAL = 'esqueletal',
  DENTOALVEOLAR = 'dentoalveolar',
  NO_PRESENTA = 'no_presenta',
}

enum VerticalRelation {
  NORMAL = 'normal',
  BIS_A_BIS = 'bis_a_bis',
  MORDIDA_PROFUNDA = 'mordida_profunda',
  MORDIDA_ABIERTA = 'mordida_abierta',
}

enum SagittalIncisors {
  NORMAL = 'normal',
  OVERJET_AUMENTADO = 'overjet_aumentado',
  MORDIDA_CRUZADA_ANTERIOR = 'mordida_cruzada_anterior',
}

enum SagittalRelation {
  CLASE_I = 'claseI',
  CLASE_II = 'claseII',
  CLASE_III = 'claseIII',
  MEDIA_CLASE_II = 'mediaClaseII',
  TRES_CUARTOS_CLASE_II = 'tresCuartosClaseII',
  COMPLETA_CLASE_II = 'completaClaseII',
  MEDIA_CLASE_III = 'mediaClaseIII',
  TRES_CUARTOS_CLASE_III = 'tresCuartosClaseIII',
  COMPLETA_CLASE_III = 'completaClaseIII',
}

// --- CLASES ANIDADAS PARA VALIDACIÓN ---

// Sección 1: General
class OrthoPreviousTreatmentDto {
  @IsBoolean()
  @IsOptional()
  hasPrevious: boolean | null;

  @IsString()
  @IsOptional()
  comments: string | null;
}

class OrthoGeneralAnalysisDto {
  @IsString()
  @IsOptional()
  mainComplaint: string | null;

  @IsString()
  @IsOptional()
  medicalHistory: string | null;

  @IsString()
  @IsOptional()
  traumaHistory: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => OrthoPreviousTreatmentDto)
  @IsOptional()
  previousTreatment: OrthoPreviousTreatmentDto;

  @IsEnum(CollaborationIndex)
  @IsOptional()
  collaborationIndex: CollaborationIndex | null;

  @IsEnum(OralHygiene)
  @IsOptional()
  oralHygiene: OralHygiene | null;

  @IsString()
  @IsOptional()
  needsGeneralTreatment: string | null;
}

// Sección 2: Facial
class OrthoFacialThirdsDto {
  @IsBoolean() @IsOptional() proportional: boolean | null;
  @IsBoolean() @IsOptional() upperAugmented: boolean | null;
  @IsBoolean() @IsOptional() middleAugmented: boolean | null;
  @IsBoolean() @IsOptional() lowerAugmented: boolean | null;
  @IsBoolean() @IsOptional() upperDiminished: boolean | null;
  @IsBoolean() @IsOptional() middleDiminished: boolean | null;
  @IsBoolean() @IsOptional() lowerDiminished: boolean | null;
}

class OrthoFacialSymmetryDto {
  @IsBoolean() @IsOptional() isSymmetric: boolean | null;
  
  @IsEnum(SymmetryDeviation)
  @IsOptional()
  deviation: SymmetryDeviation | null;
}

class OrthoFacialPatternDto {
  @IsEnum(FacialPattern)
  @IsOptional()
  pattern: FacialPattern | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  details: string[];
}

class OrthoFacialAnalysisDto {
  @IsEnum(FacialType) @IsOptional() facialType: FacialType | null;
  @IsEnum(Convexity) @IsOptional() convexity: Convexity | null;
  @IsBoolean() @IsOptional() lipSeal: boolean | null;
  
  @IsObject() @ValidateNested() @Type(() => OrthoFacialThirdsDto) @IsOptional()
  facialThirds: OrthoFacialThirdsDto;
  
  @IsObject() @ValidateNested() @Type(() => OrthoFacialSymmetryDto) @IsOptional()
  restSymmetry: OrthoFacialSymmetryDto;
  
  @IsObject() @ValidateNested() @Type(() => OrthoFacialSymmetryDto) @IsOptional()
  openingSymmetry: OrthoFacialSymmetryDto;

  @IsEnum(NasolabialAngle) @IsOptional() nasolabialAngle: NasolabialAngle | null;
  @IsEnum(MentolabialAngle) @IsOptional() mentolabialAngle: MentolabialAngle | null;
  @IsEnum(ZygomaticProjection) @IsOptional() zygomaticProjection: ZygomaticProjection | null;
  @IsEnum(ChinNeckLine) @IsOptional() chinNeckLine: ChinNeckLine | null;
  @IsEnum(ChinNeckAngle) @IsOptional() chinNeckAngle: ChinNeckAngle | null;
  
  @IsObject() @ValidateNested() @Type(() => OrthoFacialPatternDto) @IsOptional()
  facialPattern: OrthoFacialPatternDto;
}

// Sección 3: Oclusal
class OrthoOcclusalTransversalDto {
  @IsEnum(TransversalRelation) @IsOptional() relation: TransversalRelation | null;
  @IsEnum(CrossbiteFeatures) @IsOptional() crossbiteFeatures: CrossbiteFeatures | null;
}

class OrthoOcclusalVerticalDto {
  @IsEnum(VerticalRelation) @IsOptional() relation: VerticalRelation | null;
  @IsString() @IsOptional() amount: string | null;
}

class OrthoOcclusalSpeeCurveDto {
  @IsBoolean() @IsOptional() isAltered: boolean | null;
  @IsArray() @IsString({ each: true }) @IsOptional() details: string[];
}

class OrthoOcclusalSagittalRelationDto {
  @IsEnum(SagittalRelation) @IsOptional() right: SagittalRelation | null;
  @IsEnum(SagittalRelation) @IsOptional() left: SagittalRelation | null;
}

class OrthoOcclusalMidlineDto {
  @IsBoolean() @IsOptional() coincident: boolean | null;
  @IsEnum(SymmetryDeviation) @IsOptional() upperDeviation: SymmetryDeviation | null;
  @IsEnum(SymmetryDeviation) @IsOptional() lowerDeviation: SymmetryDeviation | null;
}

class OrthoOcclusalAnalysisDto {
  @IsEnum(RCRelation) @IsOptional() manipulation: RCRelation | null;
  
  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalTransversalDto) @IsOptional()
  transversal: OrthoOcclusalTransversalDto;
  
  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalVerticalDto) @IsOptional()
  vertical: OrthoOcclusalVerticalDto;

  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalSpeeCurveDto) @IsOptional()
  speeCurve: OrthoOcclusalSpeeCurveDto;

  @IsEnum(SagittalIncisors) @IsOptional() sagittalIncisors: SagittalIncisors | null;
  
  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalSagittalRelationDto) @IsOptional()
  mihCanineRelation: OrthoOcclusalSagittalRelationDto;

  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalSagittalRelationDto) @IsOptional()
  mihMolarRelation: OrthoOcclusalSagittalRelationDto;

  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalSagittalRelationDto) @IsOptional()
  rcCanineRelation: OrthoOcclusalSagittalRelationDto;

  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalSagittalRelationDto) @IsOptional()
  rcMolarRelation: OrthoOcclusalSagittalRelationDto;

  @IsObject() @ValidateNested() @Type(() => OrthoOcclusalMidlineDto) @IsOptional()
  midline: OrthoOcclusalMidlineDto;

  @IsString() @IsOptional() dentalAnomalies: string | null;
  @IsString() @IsOptional() atmCondition: string | null;
  @IsString() @IsOptional() familyMalocclusion: string | null;
}

// Sección 5: Funcional
class OrthoFunctionalAnalysisDto {
  @IsString() @IsOptional()
  respirationType: string | null;
}


// --- CLASE DTO PRINCIPAL ---
export class UpdateOrthodonticHistoryDto {
  @IsObject()
  @ValidateNested()
  @Type(() => OrthoGeneralAnalysisDto)
  @IsOptional()
  generalAnalysis?: OrthoGeneralAnalysisDto;

  @IsObject()
  @ValidateNested()
  @Type(() => OrthoFacialAnalysisDto)
  @IsOptional()
  facialAnalysis?: OrthoFacialAnalysisDto;

  @IsObject()
  @ValidateNested()
  @Type(() => OrthoOcclusalAnalysisDto)
  @IsOptional()
  occlusalAnalysis?: OrthoOcclusalAnalysisDto;

  @IsObject()
  @ValidateNested()
  @Type(() => OrthoFunctionalAnalysisDto)
  @IsOptional()
  functionalAnalysis?: OrthoFunctionalAnalysisDto;

  @IsString()
  @IsOptional()
  cephalometricAnalysis?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  treatmentPlan?: string;
}