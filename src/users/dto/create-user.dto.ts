import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

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
