import { IsEnum, IsNotEmpty, IsNumber, IsString, IsIn, IsOptional } from 'class-validator';
import { OdontogramRecordType } from '../enums/record-type.enum';

export class CreateBridgeDto {
  @IsNumber()
  @IsNotEmpty()
  startTooth: number;

  @IsNumber()
  @IsNotEmpty()
  endTooth: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['red', 'blue'])
  color: string;

  @IsEnum(OdontogramRecordType)
  @IsOptional()
  recordType?: OdontogramRecordType;
}