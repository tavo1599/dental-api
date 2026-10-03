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
  Min,
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
   *
   * En un ajuste se puede mandar `countedQuantity` en su lugar y dejar que el
   * servidor calcule la diferencia.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  quantity?: number;

  /**
   * CONTEO FISICO: cuanto hay de verdad en la sede.
   *
   * Solo para ajustes. El servidor lee el saldo con la fila bloqueada y calcula
   * la diferencia el mismo. Se hace asi y no mandando la resta ya calculada
   * porque entre leer el stock en pantalla y guardar el ajuste alguien puede
   * haber vendido o consumido: el calculo tiene que ocurrir dentro del bloqueo.
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  countedQuantity?: number;

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
