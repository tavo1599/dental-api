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

/**
 * Una linea del presupuesto: un TRATAMIENTO del catalogo o un PRODUCTO del
 * inventario. Los dos campos son opcionales por separado porque la linea es
 * una cosa o la otra; que venga exactamente uno lo comprueba el servicio, que
 * es quien puede dar un mensaje util.
 */
/** Un insumo que se gasta en una linea concreta del presupuesto. */
class BudgetItemSupplyDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;
}

class BudgetItemDto {
  @IsOptional()
  @IsUUID()
  treatmentId?: string;

  /** Producto que se le cobra al paciente (una crema, un kit, un alineador). */
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  priceAtTimeOfBudget: number;

  /**
   * En cuantas sesiones se presta. Si no viene, se toma del catalogo.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionsTotal?: number;

  /**
   * Lo que se va a gastar en esta linea.
   *
   * Si no viene, se usa la receta del catalogo del tratamiento. Si viene,
   * manda esto y la receta no se toca: es un ajuste para ESTE paciente.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemSupplyDto)
  supplies?: BudgetItemSupplyDto[];
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