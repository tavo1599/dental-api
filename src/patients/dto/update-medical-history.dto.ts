import { IsString, IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateMedicalHistoryDto {
  @IsString()
  @IsOptional()
  mainComplaint?: string;

  @IsBoolean()
  @IsOptional()
  isUnderMedicalTreatment?: boolean;

  @IsString()
  @IsOptional()
  medicalTreatmentDescription?: string;

  @IsString()
  @IsOptional()
  currentMedications?: string;

  @IsString()
  @IsOptional()
  systemicDiseases?: string;

  @IsBoolean()
  @IsOptional()
  hasBleedingIssues?: boolean;

  @IsBoolean()
  @IsOptional()
  isPregnant?: boolean | null;

  @IsDateString()
  @IsOptional()
  lastDentalVisit?: Date | null;

  @IsString()
  @IsOptional()
  reasonForLastVisit?: string;
}