import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min,  IsInt } from 'class-validator';

export class CreateTreatmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // El precio llega como string desde el front (Postgres devuelve 'decimal' como texto),
  // por eso lo convertimos antes de validar.
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  duration?: number; // Duración en minutos, opcional

  /**
   * En cuantas sesiones se presta el servicio. 1 para lo que se hace de una
   * vez; mas para lo que se cobra por paquete (terapia, estetica, ortodoncia).
   *
   * @Type(() => Number) porque un <input type="number"> puede llegar como
   * texto, igual que pasa con el precio.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  defaultSessions?: number;
}
