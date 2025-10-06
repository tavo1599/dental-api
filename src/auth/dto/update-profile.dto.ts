import { IsOptional, IsString, IsPhoneNumber } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsPhoneNumber('PE', { message: 'El número de teléfono no es válido.' })
  @IsOptional()
  phone?: string;
}