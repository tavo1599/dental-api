import { IsISO8601, IsOptional } from 'class-validator';

export class UpdateAppointmentTimeDto {
  @IsISO8601()
  startTime: string;

  @IsISO8601()
  @IsOptional()
  endTime: string;
}