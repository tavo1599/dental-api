import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  Req, 
  UploadedFile, 
  UseGuards, 
  UseInterceptors, 
  NotFoundException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

// 1. CONTROLADOR PRIVADO (Gestión interna de la clínica)
@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Protegemos todas las rutas internas
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('logo')
  @Roles(UserRole.ADMIN) // Solo el dueño de la clínica puede cambiar el logo
  @UseInterceptors(FileInterceptor('file')) 
  uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File) {
    return this.tenantsService.updateLogo(req.user.tenantId, file);
  }

  @Patch('profile')
  @Roles(UserRole.ADMIN) // Solo el dueño puede actualizar el perfil y la web
  updateProfile(@Req() req, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateProfile(req.user.tenantId, dto);
  }
}

// 2. CONTROLADOR PÚBLICO (Para la Landing Page externa)
// Este controlador es accesible sin token para que los pacientes vean la web
@Controller('public/tenants')
export class PublicTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':slug')
  async getPublicInfo(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant) throw new NotFoundException('Clínica no encontrada');
    
    // Filtramos los usuarios para enviar solo el equipo médico al sitio público
    const publicUsers = (tenant.users || [])
      .filter(u => u.role === UserRole.DENTIST || u.role === UserRole.ADMIN)
      .map(u => ({
         id: u.id,
         fullName: u.fullName,
         photoUrl: u.photoUrl,
         specialty: u.specialty,
         cmp: u.cmp,
         bio: u.bio,
         role: u.role
      }));

    // Retornamos la información necesaria para pintar la web
    return {
      id: tenant.id,
      name: tenant.name,
      domainSlug: tenant.domainSlug, // Agregado para consistencia
      logoUrl: tenant.logoUrl,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      // websiteConfig ya contiene: theme, services, subTitle, etc. gracias a la nueva Entidad
      websiteConfig: tenant.websiteConfig, 
      users: publicUsers 
    };
  }
}