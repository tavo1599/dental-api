import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ToothStatus } from '../../types/tooth-status.enum';

class OdontogramUpdateItemDto {
  @IsNumber()
  @IsNotEmpty()
  toothNumber: number;

  @IsEnum(ToothStatus)
  @IsNotEmpty()
  status: ToothStatus;

  @IsString()
  @IsOptional() // <-- La superficie es opcional
  surface?: string;
}

export class UpdateOdontogramDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OdontogramUpdateItemDto)
  updates: OdontogramUpdateItemDto[];
}