import { Controller, Get, Query, Req, Res, UseGuards, Delete } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  // Ruta para iniciar la autenticación
  // Quitamos el @UseGuards para que no pida el token JWT
  @Get('auth')
  getAuthUrl(@Query('tenantId') tenantId: string, @Res() res: Response) {
    const url = this.googleCalendarService.generateAuthUrl(tenantId);
    res.redirect(url);
  }

  // Ruta de callback (esta no necesita cambios)
  @Get('auth/callback')
  async authCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    await this.googleCalendarService.handleAuthCallback(code, state);
    res.send('¡Autenticación completada! Puedes cerrar esta ventana.');
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt')) // Esta ruta SÍ necesita protección
  getIntegrationStatus(@Req() req) {
    return this.googleCalendarService.getIntegrationStatus(req.user.tenantId);
  }

  @Delete('integration')
  @UseGuards(AuthGuard('jwt')) // Esta ruta SÍ necesita protección
  unlink(@Req() req) {
    return this.googleCalendarService.unlink(req.user.tenantId);
  }
}