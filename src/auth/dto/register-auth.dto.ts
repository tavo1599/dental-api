import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterAuthDto {
  @IsString()
  @IsNotEmpty()
  clinicName: string;

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