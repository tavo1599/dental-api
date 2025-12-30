import { IsString, IsOptional, IsEmail, IsObject, IsNumber, IsBoolean } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsString()
  domainSlug?: string; // El subdominio (ej: 'clinica-dental-sur')

  @IsOptional()
  @IsObject()
  websiteConfig?: {
    primaryColor?: string;
    secondaryColor?: string;
    welcomeMessage?: string;
    aboutUs?: string;
    heroImageUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    whatsappNumber?: string;
    showStaff?: boolean;
    addressCoordinates?: { lat: number, lng: number };
  };
}