import { IsString, IsOptional, IsEmail, IsObject, IsBoolean, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Clase para validar cada servicio o especialidad individualmente.
 * Esto asegura que cada objeto dentro del arreglo cumpla con la estructura necesaria.
 */
export class ServiceItemDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  iconType?: string; // Ej: 'braces', 'implant', 'esthetic', 'kids', etc.
}

export class WebsiteConfigDto {
  // Estilo visual
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() secondaryColor?: string;
  
  // Contenido de la sección de bienvenida (Hero)
  @IsOptional() @IsString() welcomeMessage?: string;
  @IsOptional() @IsString() subTitle?: string;
  @IsOptional() @IsString() heroImageUrl?: string; 

  // Sección Sobre Nosotros
  @IsOptional() @IsString() aboutUs?: string;
  @IsOptional() @IsString() aboutUsImageUrl?: string;

  // Contacto y Redes Sociales
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsString() facebookUrl?: string;
  @IsOptional() @IsString() instagramUrl?: string;
  @IsOptional() @IsString() tiktokUrl?: string;
  @IsOptional() @IsString() youtubeUrl?: string;
  @IsOptional() @IsString() mapsUrl?: string;
  
  // Información Operativa
  @IsOptional() @IsString() schedule?: string;
  @IsOptional() @IsObject() addressCoordinates?: { lat: number, lng: number };
  
  // Configuración de visualización
  @IsOptional() @IsBoolean() showStaff?: boolean;
  
  /**
   * MODIFICADO: Lista de servicios administrables.
   * Ahora validamos que cada elemento sea un objeto de tipo ServiceItemDto.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services?: ServiceItemDto[];
}

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
  domainSlug?: string; // Identificador para la URL (subdominio)

  @IsOptional()
  @ValidateNested()
  @Type(() => WebsiteConfigDto)
  websiteConfig?: WebsiteConfigDto;
}