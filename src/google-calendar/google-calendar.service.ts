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
    // Leemos la URL base desde las variables de entorno
    const redirectUri = `${this.configService.get('API_BASE_URL')}/google-calendar/auth/callback`;
    
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirectUri, // Usamos la URL dinámica
    );
  }

  generateAuthUrl(tenantId: string) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: tenantId, // Usamos 'state' para pasar el ID de la clínica
    });
  }

  // Maneja el callback de Google, obtiene y guarda los tokens
  async handleAuthCallback(code: string, tenantId: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (tenant) {
      tenant.googleAccessToken = tokens.access_token;
      // El refresh_token es muy importante para obtener nuevos access_tokens sin que el usuario vuelva a loguearse
      if (tokens.refresh_token) {
        tenant.googleRefreshToken = tokens.refresh_token;
      }
      tenant.googleCalendarId = 'primary'; // Usamos el calendario principal por defecto
      await this.tenantRepository.save(tenant);
    }
    return { message: '¡Calendario de Google conectado con éxito!' };
  }

  // --- NUEVO MÉTODO PARA CREAR EL EVENTO ---
  async createEvent(tenantId: string, appointment: Appointment) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant || !tenant.googleRefreshToken) {
      this.logger.warn(`La clínica ${tenantId} no tiene Google Calendar conectado. Omitiendo creación de evento.`);
      return;
    }

    this.oauth2Client.setCredentials({
      refresh_token: tenant.googleRefreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

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
      // Añadimos al paciente como invitado para que reciba la invitación
      attendees: [{ email: appointment.patient.email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // Recordatorio por email 1 día antes
          { method: 'popup', minutes: 60 },      // Recordatorio de notificación 1 hora antes
        ],
      },
    };

    try {
      this.logger.log(`Creando evento en Google Calendar para la cita ${appointment.id}`);
      await calendar.events.insert({
        calendarId: 'primary', // Usa el calendario principal de la cuenta conectada
        requestBody: event,
      });
      this.logger.log('Evento creado con éxito.');
    } catch (error) {
      this.logger.error('Error al crear el evento en Google Calendar', error);
    }
  }
}