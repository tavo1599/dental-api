import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { OdontogramRecordType } from '../enums/record-type.enum';

export class CreateToothStateDto {
  @IsNumber()
  @IsNotEmpty()
  toothNumber: number;

  @IsString()
  @IsNotEmpty()
  condition: string; // Ej: "Tratamiento Pulpar"

  @IsString()
  @IsOptional()
  sub_type?: string; // Ej: "Pulpotomía"

  @IsString()
  @IsNotEmpty()
  abbreviation: string; // Ej: "PP"

  @IsString()
  @IsNotEmpty()
  @IsIn(['bueno', 'malo', 'evolucionado']) 
  status: 'bueno' | 'malo' | 'evolucionado';

  @IsEnum(OdontogramRecordType)
  @IsOptional()
  recordType?: OdontogramRecordType;
}