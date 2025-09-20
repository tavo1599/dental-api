import { IsDateString, IsNotEmpty } from 'class-validator';

export class FinancialReportDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}