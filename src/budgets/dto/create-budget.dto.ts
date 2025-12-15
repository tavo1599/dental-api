import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString,
  IsUUID, 
  Min, 
  ValidateNested 
} from 'class-validator';

// DTO para los items individuales (Aparatología/Tratamientos)
class BudgetItemDto {
  @IsUUID()
  @IsNotEmpty()
  treatmentId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  priceAtTimeOfBudget: number;
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
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  // --- NUEVOS CAMPOS DE ORTODONCIA (VALIDACIÓN) ---

  @IsOptional()
  @IsBoolean()
  isOrthodontic?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['preventive', 'corrective'])
  orthoType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseTreatmentCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPayment?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPayment?: number;
}