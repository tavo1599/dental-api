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

  /**
   * OPCIONAL a proposito.
   *
   * Cuando el super admin da de alta una clinica no la manda: el titular
   * recibe un enlace por correo y la establece el mismo. Asi nadie del equipo
   * llega a conocer la contrasena de un cliente.
   *
   * Se mantiene aceptada para el registro publico, si algun dia se abre.
   */
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional() // Significa que este campo puede no venir
  phone?: string;
}