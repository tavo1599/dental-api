import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

class BudgetItemDto {
  @IsUUID()
  @IsNotEmpty()
  treatmentId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateBudgetDto {
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

   // --- AÑADE ESTA PROPIEDAD ---
  @IsUUID()
  @IsOptional()
  doctorId?: string;
  // --- FIN ---

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}