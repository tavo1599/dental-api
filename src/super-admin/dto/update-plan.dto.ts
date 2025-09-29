import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsNumber()
  @IsNotEmpty()
  maxUsers: number;
}