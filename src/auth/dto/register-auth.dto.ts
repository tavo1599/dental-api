import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ClinicSpecialty } from '../../tenants/specialty';

export class RegisterAuthDto {
  @IsString()
  @IsNotEmpty()
  clinicName: string;

  /** A que se dedica la clinica. Si no viene, dental. */
  @IsEnum(ClinicSpecialty)
  @IsOptional()
  specialty?: ClinicSpecialty;

  @IsString()
  @IsOptional()
  clinicPhone?: string;

  @IsEmail()
  @IsOptional()
  clinicEmail?: string;

  @IsString()
  @IsOptional()
  clinicAddress?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6) // Buena práctica: exigir una contraseña mínima
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional() // Significa que este campo puede no venir
  phone?: string;
}