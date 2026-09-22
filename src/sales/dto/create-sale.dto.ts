import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class SaleItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  /** Si no se envia, se toma el precio de venta del catalogo. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitPrice?: number;
}

export class SalePaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}

export class CreateSaleDto {
  /** Paciente registrado. Si no viene, es una venta a publico general. */
  @IsUUID()
  @IsOptional()
  patientId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  customerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerDocument?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  /** Cobro en el acto. Entra por la misma tabla de pagos que los tratamientos. */
  @ValidateNested()
  @Type(() => SalePaymentDto)
  @IsOptional()
  payment?: SalePaymentDto;

  @IsString()
  @IsOptional()
  notes?: string;
}
