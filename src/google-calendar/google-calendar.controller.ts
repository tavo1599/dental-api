import { Controller, Get, Query, Req, Res, UseGuards, Delete } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth')
  // No necesita @UseGuards porque la seguridad la manejamos al verificar el tenantId
  getAuthUrl(@Query('tenantId') tenantId: string, @Res() res: Response) {
    // Genera la URL de autenticación de Google
    const url = this.googleCalendarService.generateAuthUrl(tenantId);
    // Redirige al usuario a la página de autenticación de Google
    res.redirect(url);
  }

  @Get('auth/callback')
  async authCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    await this.googleCalendarService.handleAuthCallback(code, state);
    res.send('<script>window.close();</script>');
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  getIntegrationStatus(@Req() req) {
    return this.googleCalendarService.getIntegrationStatus(req.user.tenantId);
  }

  @Delete('integration')
  @UseGuards(AuthGuard('jwt'))
  unlink(@Req() req) {
    return this.googleCalendarService.unlink(req.user.tenantId);
  }
}