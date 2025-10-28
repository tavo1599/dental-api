import { Controller, Get, UseGuards, Post, Body, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('active')
  @UseGuards(AuthGuard('jwt')) // Asegura que solo usuarios logueados puedan ver el anuncio
  findActive() {
    return this.announcementsService.findActive();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN) // Se requiere role admin, pero además validamos isSuperAdmin abajo
  async create(@Body() createDto: CreateAnnouncementDto, @Req() req) {
    // Solo superadmin puede publicar (validación adicional)
    if (!req.user?.isSuperAdmin) {
      throw new ForbiddenException('Only super admins can publish announcements');
    }

    return this.announcementsService.create(createDto);
  }
}