// src/patients/dto/create-patient.dto.ts
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '../entities/patient.entity';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  fullName: string;

  /**
   * DNI y fecha de nacimiento son OPCIONALES: recepcion da de alta con el
   * nombre y un celular, y la ficha se completa cuando el paciente llega.
   */
  @IsString()
  @IsOptional()
  dni?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: Date;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;
  
  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  relevantMedicalHistory?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  fileCode?: string;
}