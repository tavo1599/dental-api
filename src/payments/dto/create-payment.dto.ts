import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsUUID } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  budgetId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  // --- CORRECCIÓN AQUÍ ---
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string; // Debe ser 'string', no 'Date'

  @IsString()
  @IsOptional()
  notes?: string;
}