import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  phone?: string;

  // --- NUEVOS CAMPOS PARA PERFIL PÚBLICO (DOCTORES) ---
  
  @IsString()
  @IsOptional()
  specialty?: string; // Ej: Ortodoncista

  @IsString()
  @IsOptional()
  cmp?: string; // Número de colegio

  @IsString()
  @IsOptional()
  photoUrl?: string; // URL de la foto en R2

  @IsString()
  @IsOptional()
  bio?: string; // Breve descripción
}