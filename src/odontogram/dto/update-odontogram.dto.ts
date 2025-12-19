import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ToothStatus } from '../../types/tooth-status.enum';
import { OdontogramRecordType } from '../enums/record-type.enum';

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

  @IsEnum(OdontogramRecordType)
  @IsOptional() // Si no se envía, asumiremos EVOLUTION por defecto
  recordType?: OdontogramRecordType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OdontogramUpdateItemDto)
  updates: OdontogramUpdateItemDto[];
}