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
    // Estilo
    primaryColor?: string;
    secondaryColor?: string;
    
    // Contenido Hero
    welcomeMessage?: string;
    subTitle?: string;
    heroImageUrl?: string; 

    // Sección Nosotros
    aboutUs?: string;
    aboutUsImageUrl?: string;

    // Contacto y Redes
    whatsappNumber?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
    
    // Info Operativa
    schedule?: string;
    addressCoordinates?: { lat: number, lng: number };
    
    // Configuración
    showStaff?: boolean;
    
    // Servicios (flexible)
    services?: any[];
  };
}