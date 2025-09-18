import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

class UpdateMeasurementDto {
  @IsNumber()
  @IsNotEmpty()
  toothNumber: number;

  @IsNumber() @IsOptional() @Min(0) @Max(20)
  vestibularDistal?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(20)
  vestibularMedial?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(20)
  vestibularMesial?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(20)
  lingualDistal?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(20)
  lingualMedial?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(20)
  lingualMesial?: number;

  @IsBoolean() @IsOptional()
  bleeding?: boolean;

  @IsBoolean() @IsOptional()
  suppuration?: boolean;

  @IsNumber() @IsOptional() @Min(0) @Max(3)
  mobility?: number;
}

export class UpdatePeriodontogramDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMeasurementDto)
  updates: UpdateMeasurementDto[];
}