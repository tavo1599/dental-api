import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Todos los campos son opcionales a proposito: la ficha se llena por partes y
 * se guarda a medias muchas veces.
 */
export class UpdateAestheticHistoryDto {
  // --- Piel ---
  @IsString() @IsOptional() @MaxLength(5)
  skinPhototype?: string;

  @IsString() @IsOptional()
  skinType?: string;

  @IsString() @IsOptional()
  currentConditions?: string;

  @IsString() @IsOptional()
  currentSkincare?: string;

  // --- Antecedentes de procedimientos ---
  @IsString() @IsOptional()
  previousTreatments?: string;

  @IsString() @IsOptional()
  previousFillers?: string;

  @IsString() @IsOptional()
  previousSurgeries?: string;

  // --- Contraindicaciones ---
  @IsBoolean() @IsOptional()
  keloidTendency?: boolean;

  @IsBoolean() @IsOptional()
  recurrentHerpes?: boolean;

  @IsBoolean() @IsOptional()
  usesIsotretinoin?: boolean;

  @IsBoolean() @IsOptional()
  usesRetinoids?: boolean;

  @IsBoolean() @IsOptional()
  recentSunExposure?: boolean;

  @IsBoolean() @IsOptional()
  usesSunscreen?: boolean;

  @IsBoolean() @IsOptional()
  hasMetalImplants?: boolean;

  @IsString() @IsOptional()
  otherContraindications?: string;

  // --- Plan ---
  @IsString() @IsOptional()
  expectations?: string;

  @IsString() @IsOptional()
  treatmentPlan?: string;
}
