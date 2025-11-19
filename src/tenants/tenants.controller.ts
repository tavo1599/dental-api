import { Controller, Post, Req, Patch, Body, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
// Se eliminaron diskStorage y extname ya que no guardamos en disco local
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('logo')
  @Roles(UserRole.ADMIN) // Solo el admin de la clínica puede cambiar el logo
  @UseGuards(RolesGuard)
  // Utilizamos MemoryStorage por defecto (quitando 'storage' de Multer)
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