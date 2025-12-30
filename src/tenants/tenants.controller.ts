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

// 1. CONTROLADOR PRIVADO (Gestión interna)
@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('logo')
  @Roles(UserRole.ADMIN) // Solo el admin de la clínica puede cambiar el logo
  @UseGuards(RolesGuard)
  // Utilizamos MemoryStorage por defecto
  @UseInterceptors(FileInterceptor('file')) 
  uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File) {
    // El servicio se encarga de procesar el buffer y subirlo a R2
    return this.tenantsService.updateLogo(req.user.tenantId, file);
  }

  @Patch('profile')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  updateProfile(@Req() req, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateProfile(req.user.tenantId, dto);
  }
}

// 2. CONTROLADOR PÚBLICO (Para la página web de la clínica)
// Este controlador NO tiene @UseGuards(AuthGuard), por lo que es accesible desde internet
@Controller('public/tenants')
export class PublicTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':slug')
  async getPublicInfo(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant) throw new NotFoundException('Clínica no encontrada');
    
    // Solo devolvemos datos seguros y públicos
    return {
      id: tenant.id,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      websiteConfig: tenant.websiteConfig // Colores, textos, etc.
    };
  }
}