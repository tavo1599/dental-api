import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, MaxLength } from 'class-validator';

export class CreateClinicalHistoryEntryDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  evolution?: string;

  @IsString()
  @IsOptional()
  treatmentPerformed?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  prescription?: string;

  @IsString()
  @IsOptional()
  indications?: string;

  // --- CAMPOS DE SIGNOS VITALES AÑADIDOS ---
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
  // --- FIN ---
}