import { Type } from 'class-transformer';
import { IsOptional, IsBoolean, IsEnum, IsString, MaxLength } from 'class-validator';
import {
  CollaborationIndex,
  FacialType,
  Convexity,
  NasolabialAngle,
  MentolabialAngle,
  ZygomaticProjection,
  ChinNeckLine,
  ChinNeckAngle,
  FacialPattern,
  DentalTransverseRelation,
  CrossbiteCharacteristic,
  VerticalRelation,
  OralHygiene,
} from '../entities/orthodontic-anamnesis.entity';

export class UpdateOrthodonticAnamnesisDto {
  // --- ANAMNESIS ---
  @IsOptional()
  @IsString()
  mainComplaint?: string; // <-- AÑADIDO

  @IsOptional()
  @IsString()
  medicalHistory?: string; // <-- AÑADIDO

  @IsOptional()
  @IsString()
  traumaHistory?: string; // <-- AÑADIDO

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  previousOrthodonticTreatment?: boolean;

  @IsOptional()
  @IsString()
  previousOrthodonticTreatmentDetails?: string;

  @IsOptional()
  @IsEnum(CollaborationIndex)
  collaborationIndex?: CollaborationIndex;

  @IsOptional()
  @IsEnum(OralHygiene)
  oralHygiene?: OralHygiene; // <-- AÑADIDO

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  needsGeneralTreatment?: boolean;

  @IsOptional()
  @IsString()
  needsGeneralTreatmentDetails?: string;

  // --- ANALISIS FACIAL ---
  @IsOptional()
  @IsEnum(FacialType)
  facialType?: FacialType;

  @IsOptional()
  @IsEnum(Convexity)
  convexity?: Convexity;

  @IsOptional()
  @IsString()
  proportionThirds?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  labialSeal?: boolean;

  @IsOptional()
  @IsString()
  facialSymmetryAtRest?: string;

  @IsOptional()
  @IsString()
  facialSymmetryOnMouthOpening?: string;

  @IsOptional()
  @IsEnum(NasolabialAngle)
  nasolabialAngle?: NasolabialAngle;

  @IsOptional()
  @IsEnum(MentolabialAngle)
  mentolabialAngle?: MentolabialAngle;

  @IsOptional()
  @IsEnum(ZygomaticProjection)
  zygomaticProjection?: ZygomaticProjection;

  @IsOptional()
  @IsEnum(ChinNeckLine)
  chinNeckLine?: ChinNeckLine;

  @IsOptional()
  @IsEnum(ChinNeckAngle)
  chinNeckAngle?: ChinNeckAngle;

  @IsOptional()
  @IsEnum(FacialPattern)
  facialPattern?: FacialPattern;

  // --- ANALISIS OCLUSAL ---
  @IsOptional()
  @IsString()
  occlusionOnManipulation?: string;

  @IsOptional()
  @IsEnum(DentalTransverseRelation)
  dentalTransverseRelation?: DentalTransverseRelation;

  @IsOptional()
  @IsEnum(CrossbiteCharacteristic)
  crossbiteCharacteristic?: CrossbiteCharacteristic;

  @IsOptional()
  @IsEnum(VerticalRelation)
  verticalRelation?: VerticalRelation;

  @IsOptional()
  @IsString()
  speeCurve?: string;

  @IsOptional()
  @IsString()
  incisorSagittalRelation?: string;

  @IsOptional()
  @IsString()
  canineRelationRight?: string;

  @IsOptional()
  @IsString()
  canineRelationLeft?: string;

  @IsOptional()
  @IsString()
  molarRelationRight?: string;

  @IsOptional()
  @IsString()
  molarRelationLeft?: string;

  @IsOptional()
  @IsString()
  centricRelation?: string;

  @IsOptional()
  @IsString()
  midline?: string;

  @IsOptional()
  @IsString()
  dentalAnomalies?: string;

  @IsOptional()
  @IsString()
  tmjCondition?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  familyWithSameMalocclusion?: boolean;

  @IsOptional()
  @IsString()
  familyMemberDetail?: string;

  @IsOptional()
  @IsString()
  cephalometricAnalysis?: string;

  @IsOptional()
  @IsString()
  functionalDiagnoses?: string;
}