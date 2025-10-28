import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsUUID, 
  Min, 
  ValidateNested 
} from 'class-validator';

// Esta clase anidada define la forma de cada 'item'
// El DTO espera que cada item tenga estas 3 propiedades
class BudgetItemDto {
  @IsUUID()
  @IsNotEmpty()
  treatmentId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  priceAtTimeOfBudget: number; // <-- Tu formulario ya envía esto
}

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;
  
  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto) // <-- Le dice a NestJS que use la clase de arriba
  items: BudgetItemDto[];

  // El DTO espera el subtotal
  @IsNumber()
  @Min(0)
  totalAmount: number; // <-- Tu formulario ya envía esto

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number; // <-- Tu formulario ya envía esto
}