import { PartialType } from '@nestjs/mapped-types';
import { CreateConsentTemplateDto } from './create-consent-template.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateConsentTemplateDto extends PartialType(CreateConsentTemplateDto) {
    @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  category?: string;
}