import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TenantsService } from './tenants.service';
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
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/logos',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File) {
    return this.tenantsService.updateLogo(req.user.tenantId, file);
  }
}