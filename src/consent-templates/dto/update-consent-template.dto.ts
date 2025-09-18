import { PartialType } from '@nestjs/mapped-types';
import { CreateConsentTemplateDto } from './create-consent-template.dto';

export class UpdateConsentTemplateDto extends PartialType(CreateConsentTemplateDto) {}