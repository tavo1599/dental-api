import { IsString, IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class UpdateOdontopediatricHistoryDto {
  @IsString() @IsOptional()
  childhoodIllnesses?: string;

  @IsBoolean() @IsOptional()
  vaccinesUpToDate?: boolean;

  @IsString() @IsOptional()
  allergies?: string;

  @IsString() @IsOptional()
  currentMedications?: string;

  @IsString() @IsOptional()
  previousSurgeries?: string;

  @IsString() @IsOptional()
  pregnancyIssues?: string;

  @IsString() @IsOptional()
  birthType?: string;

  @IsString() @IsOptional()
  birthComplications?: string;

  @IsString() @IsOptional()
  feedingType?: string;

  @IsBoolean() @IsOptional()
  usedBottle?: boolean;

  @IsBoolean() @IsOptional()
  usedPacifier?: boolean;

  @IsString() @IsOptional()
  oralHabits?: string;

  @IsString() @IsOptional()
  firstToothAge?: string;

  @IsDateString() @IsOptional()
  firstDentalVisit?: Date | null;

  @IsString() @IsOptional()
  previousDentalExperience?: string;
}