import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
export class CreateConsentTemplateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  forMinor: boolean;
}