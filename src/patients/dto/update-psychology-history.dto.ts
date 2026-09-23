import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Todos los campos son opcionales a proposito: la anamnesis se llena por
 * partes, a lo largo de varias sesiones, y se guarda a medias muchas veces.
 */
export class UpdatePsychologyHistoryDto {
  // --- Antecedentes de atencion psicologica ---
  @IsBoolean() @IsOptional()
  hadPreviousTherapy?: boolean;

  @IsString() @IsOptional()
  previousTherapyDetails?: string;

  @IsString() @IsOptional()
  previousDiagnoses?: string;

  @IsString() @IsOptional()
  psychiatricMedication?: string;

  @IsBoolean() @IsOptional()
  hadPsychiatricHospitalization?: boolean;

  @IsString() @IsOptional()
  familyMentalHealthHistory?: string;

  // --- Situacion actual ---
  @IsString() @IsOptional()
  occupationalSituation?: string;

  @IsString() @IsOptional()
  supportNetwork?: string;

  @IsString() @IsOptional()
  currentStressors?: string;

  @IsString() @IsOptional()
  sleepPattern?: string;

  @IsString() @IsOptional()
  substanceUse?: string;

  // --- Evaluacion de riesgo ---
  @IsBoolean() @IsOptional()
  hasSuicidalIdeation?: boolean;

  @IsBoolean() @IsOptional()
  hasPreviousAttempts?: boolean;

  @IsBoolean() @IsOptional()
  hasSelfHarm?: boolean;

  @IsString() @IsOptional()
  riskNotes?: string;

  // --- Plan ---
  @IsString() @IsOptional()
  expectations?: string;

  @IsString() @IsOptional()
  treatmentPlan?: string;
}
