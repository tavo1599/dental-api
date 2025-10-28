import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('active')
  @UseGuards(AuthGuard('jwt')) // Asegura que solo usuarios logueados puedan ver el anuncio
  findActive() {
    return this.announcementsService.findActive();
  }
}