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

/**
 * NUEVA CLASE: Valida las restricciones de seguridad y acceso por rol dentro de la clínica.
 * Esta estructura JSONB permite añadir más bloqueos en el futuro sin migrar la base de datos.
 */
export class SystemSettingsDto {
  // --- Configuración para Doctores (Dentistas) ---
  @IsOptional() @IsBoolean() dentistsCanSeePrices?: boolean;
  @IsOptional() @IsBoolean() dentistsCanManageBudgets?: boolean;
  @IsOptional() @IsBoolean() dentistsCanSeeReports?: boolean;
  @IsOptional() @IsBoolean() dentistsCanManageTreatments?: boolean;
  @IsOptional() @IsBoolean() dentistsCanSeeDashboardStats?: boolean;

  // --- Configuración para Asistentes (Recepción) ---
  @IsOptional() @IsBoolean() assistantsCanSeePrices?: boolean;
  @IsOptional() @IsBoolean() assistantsCanManageBudgets?: boolean;
  @IsOptional() @IsBoolean() assistantsCanSeeReports?: boolean;
  @IsOptional() @IsBoolean() assistantsCanManageTreatments?: boolean;
  @IsOptional() @IsBoolean() assistantsCanSeeDashboardStats?: boolean;
}

/**
 * DTO para la configuración del sitio web público de la clínica.
 */
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
   * Lista de servicios administrables.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services?: ServiceItemDto[];
}

/**
 * DTO Principal para actualizar los datos del Tenant (Clínica).
 */
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

  /**
   * Nueva propiedad para manejar las restricciones de acceso y visibilidad
   * de precios, reportes y balances desde el panel web.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => SystemSettingsDto)
  systemSettings?: SystemSettingsDto;
}