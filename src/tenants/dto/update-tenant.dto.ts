import { IsString, IsOptional, IsEmail, IsObject, IsBoolean, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// 1. Extraemos tu objeto en línea a una clase propia para que NestJS pueda validarlo por dentro
export class WebsiteConfigDto {
  // Estilo
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() secondaryColor?: string;
  
  // Contenido Hero
  @IsOptional() @IsString() welcomeMessage?: string;
  @IsOptional() @IsString() subTitle?: string;
  @IsOptional() @IsString() heroImageUrl?: string; 

  // Sección Nosotros
  @IsOptional() @IsString() aboutUs?: string;
  @IsOptional() @IsString() aboutUsImageUrl?: string;

  // Contacto y Redes
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsString() facebookUrl?: string;
  @IsOptional() @IsString() instagramUrl?: string;
  @IsOptional() @IsString() tiktokUrl?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
  @IsOptional() @IsString() mapsUrl?: string;
  
  // Info Operativa
  @IsOptional() @IsString() schedule?: string;
  @IsOptional() @IsObject() addressCoordinates?: { lat: number, lng: number };
  
  // Configuración
  @IsOptional() @IsBoolean() showStaff?: boolean;
  
  // Servicios (flexible)
  @IsOptional() @IsArray() services?: any[];
}

// 2. Tu DTO principal se mantiene igual, pero ahora usa ValidateNested para el objeto
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

  @IsString()
  @IsOptional()
  domainSlug?: string; // El subdominio (ej: 'clinica-dental-sur')

  @IsOptional()
  @ValidateNested()
  @Type(() => WebsiteConfigDto)
  websiteConfig?: WebsiteConfigDto;
}