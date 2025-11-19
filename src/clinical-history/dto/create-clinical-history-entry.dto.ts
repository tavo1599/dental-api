import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, MaxLength, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer'; // <-- IMPORTANTE: Importar esto

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

  // --- CAMPOS DE SIGNOS VITALES ---
  @IsString()
  @IsOptional()
  @MaxLength(10)
  bloodPressure?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : Number(value))) // Convierte '' a null
  @IsPositive()
  heartRate?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : Number(value)))
  @IsPositive()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : Number(value)))
  @IsPositive()
  respiratoryRate?: number;

  // --- CAMPOS PARA PRÓXIMA CITA ---
  
  @IsString()
  @IsOptional()
  // Opcional: Si quieres que se guarde como NULL en vez de "" en la base de datos
  @Transform(({ value }) => value === '' ? null : value) 
  nextAppointmentPlan?: string;

  @IsOptional()
  @IsDateString()
  // --- LA SOLUCIÓN ESTÁ AQUÍ ---
  // Si llega un string vacío "", lo transforma a null.
  // Al ser null, @IsOptional hace que @IsDateString lo ignore y pase la validación.
  @Transform(({ value }) => value === '' ? null : value)
  nextAppointmentDate?: string;
}