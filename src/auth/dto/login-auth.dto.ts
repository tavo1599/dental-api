import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';

export class LoginAuthDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  // 👇 NUEVO CAMPO OPCIONAL 👇
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}