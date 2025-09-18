import { IsNotEmpty, IsString } from 'class-validator';
export class Cie10CodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}