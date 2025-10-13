import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { google } from 'googleapis';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private oauth2Client;
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  onModuleInit() {
    const redirectUri = `${this.configService.get('API_BASE_URL')}/google-calendar/auth/callback`;
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirectUri,
    );
  }
  
  // --- FUNCIÓN INTERNA MEJORADA ---
  private async getAuthenticatedClient(tenant: Tenant) {
    if (!tenant.googleRefreshToken) {
      throw new Error('La clínica no tiene una cuenta de Google conectada.');
    }
    this.oauth2Client.setCredentials({
      refresh_token: tenant.googleRefreshToken,
    });
    // Forzamos la obtención de un nuevo access_token
    await this.oauth2Client.refreshAccessToken(); 
    return this.oauth2Client;
  }

  generateAuthUrl(tenantId: string) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Pide consentimiento siempre para asegurar el refresh_token
      scope: scopes,
      state: tenantId,
    });
  }

  async handleAuthCallback(code: string, tenantId: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (tenant) {
      tenant.googleAccessToken = tokens.access_token;
      if (tokens.refresh_token) {
        tenant.googleRefreshToken = tokens.refresh_token;
      }
      tenant.googleCalendarId = 'primary';
      await this.tenantRepository.save(tenant);
    }
    return { message: '¡Calendario de Google conectado con éxito!' };
  }

  async createEvent(tenantId: string, appointment: Appointment) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant || !tenant.googleRefreshToken) {
      this.logger.warn(`La clínica ${tenantId} no tiene Google Calendar conectado. Omitiendo creación de evento.`);
      return;
    }

    try {
      // Obtenemos un cliente con un token fresco
      const auth = await this.getAuthenticatedClient(tenant);
      const calendar = google.calendar({ version: 'v3', auth });

      const event = {
        summary: `${appointment.patient.fullName} - Cita en ${appointment.doctor.tenant.name}`,
        description: `<b>Doctor:</b> ${appointment.doctor.fullName}\n<b>Notas:</b> ${appointment.notes || 'Ninguna'}`,
        start: {
          dateTime: appointment.startTime.toISOString(),
          timeZone: 'America/Lima',
        },
        end: {
          dateTime: appointment.endTime.toISOString(),
          timeZone: 'America/Lima',
        },
        attendees: [{ email: appointment.patient.email }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      };
      
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      this.logger.log(`Evento para la cita ${appointment.id} creado con éxito.`);

    } catch (error) {
      this.logger.error('Error al crear el evento en Google Calendar', error);
    }
  }

  async getIntegrationStatus(tenantId: string) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant || !tenant.googleRefreshToken) {
      return { isConnected: false };
    }
    
    try {
      // Obtenemos un cliente con un token fresco para verificar
      const auth = await this.getAuthenticatedClient(tenant);
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const { data } = await oauth2.userinfo.get();
      return { isConnected: true, email: data.email };

    } catch (error) {
      this.logger.error('Token de Google inválido, desvinculando cuenta...', error);
      await this.unlink(tenantId);
      return { isConnected: false };
    }
  }

  async unlink(tenantId: string) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (tenant && tenant.googleRefreshToken) {
      try {
        await this.oauth2Client.revokeToken(tenant.googleRefreshToken);
      } catch (error) {
        this.logger.warn('No se pudo revocar el token, probablemente ya era inválido.');
      }
    }
    
    await this.tenantRepository.update(tenantId, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleCalendarId: null,
    });

    return { message: 'Desvinculación exitosa.' };
  }
}