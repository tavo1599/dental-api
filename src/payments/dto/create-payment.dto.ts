import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsDateString() // <-- AÑADE ESTO
  @IsNotEmpty()   // <-- AÑADE ESTO
  paymentDate: Date; // <-- AÑADE ESTO

  @IsString()
  @IsOptional()
  notes?: string;
}