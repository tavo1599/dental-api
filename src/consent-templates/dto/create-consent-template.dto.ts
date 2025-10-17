import { IsBoolean, IsNotEmpty, IsString, IsOptional } from 'class-validator';
export class CreateConsentTemplateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  forMinor: boolean;

  @IsString()
  @IsOptional()
  category?: string;
}