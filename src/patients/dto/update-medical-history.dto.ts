import { 
  IsString, 
  IsBoolean, 
  IsDateString, 
  IsOptional, 
  IsNumber, 
  IsPositive, 
  MaxLength,
  IsObject 
} from 'class-validator';

export class UpdateMedicalHistoryDto {
  @IsString()
  @IsOptional()
  mainComplaint?: string;

  @IsString()
  @IsOptional()
  illnessHistory?: string;

  @IsString()
  @IsOptional()
  biologicalFunctions?: string;
  
  @IsString()
  @IsOptional()
  familyHistory?: string;

  @IsString()
  @IsOptional()
  personalHistory?: string;
  
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
  allergies?: string;

  @IsString()
  @IsOptional()
  anesthesiaReaction?: string;
  
  @IsBoolean()
  @IsOptional()
  hasBleedingIssues?: boolean;

  @IsBoolean()
  @IsOptional()
  isPregnant?: boolean | null;

  @IsBoolean()
  @IsOptional()
  isLactating?: boolean | null;

  @IsObject()
  @IsOptional()
  medicalChecklist?: Record<string, boolean>;

  @IsObject()
  @IsOptional()
  medicalChecklistDetails?: Record<string, string>;

  @IsDateString()
  @IsOptional()
  lastDentalVisit?: string | null; // Corregido a 'string'

  @IsNumber()
  @IsOptional()
  brushingFrequency?: number;
  
  @IsBoolean()
  @IsOptional()
  usesFloss?: boolean;

  @IsBoolean()
  @IsOptional()
  bruxism?: boolean;

  @IsString()
  @IsOptional()
  oralDiscomfort?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  bloodPressure?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  heartRate?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  respiratoryRate?: number;
}