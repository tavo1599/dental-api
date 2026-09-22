import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { StockMovementType } from '../entities/stock-movement.entity';

export class CreateMovementDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  /**
   * Cantidad del movimiento. Siempre POSITIVA salvo en un ajuste, donde un
   * valor negativo resta. El servicio le pone el signo segun el tipo.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  unitCost?: number;

  /** Codigo de lote del fabricante (solo en entradas). */
  @IsString()
  @IsOptional()
  @MaxLength(60)
  lotNumber?: string;

  /** Fecha de vencimiento del lote, formato YYYY-MM-DD (solo en entradas). */
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  referenceType?: string;

  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
