import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
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

  /**
   * Sedes en las que trabaja. Solo tiene efecto si la clinica tiene el
   * modulo de sucursales activo; si no, se ignora y queda en la principal.
   * Vacio o ausente = sede principal.
   */
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  branchIds?: string[];
}
