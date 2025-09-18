import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClinicalHistoryEntryDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  treatmentPerformed?: string;
}