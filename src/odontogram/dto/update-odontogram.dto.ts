import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { ToothStatus, ToothSurface } from '../entities/tooth-surface-state.entity';

// DTO para actualizar una sola superficie
class UpdateToothSurfaceDto {
  @IsNumber()
  @IsNotEmpty()
  toothNumber: number;

  @IsEnum(ToothSurface)
  @IsNotEmpty()
  surface: ToothSurface;

  @IsEnum(ToothStatus)
  @IsNotEmpty()
  status: ToothStatus;
}

// El body de la petición será un array de estos objetos
export class UpdateOdontogramDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateToothSurfaceDto)
  updates: UpdateToothSurfaceDto[];
}