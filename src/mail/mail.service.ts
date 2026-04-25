import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService implements OnModuleInit {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY no está configurada. El envío de correos está deshabilitado.');
    }
  }

  async sendPasswordResetEmail(user: User, token: string) {
    if (!this.resend) {
      this.logger.error('Resend no está inicializado.');
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = `${frontendUrl}/reset-password?token=${token}`;
    
    // Aquí toma la variable de tu .env ("notificaciones@sonriandes.com")
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'SonriAndes <notificaciones@sonriandes.com>';

    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: [user.email as string],
        // Si el paciente presiona "Responder", te llegará a tu Gmail:
        replyTo: 'dentalsoft9@gmail.com',
        subject: '🔑 Restablecer contraseña - SonriAndes',
        html: `
          <div style="background-color: #f3f4f6; padding: 40px 10px; font-family: sans-serif;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #2563EB;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">SonriAndes</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #1f2937; margin-top: 0;">¿Olvidaste tu contraseña?</h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${user.fullName}</strong>,<br><br>
                    Recibimos una solicitud para restablecer la contraseña de tu cuenta en SonriAndes. 
                    Si no fuiste tú, puedes ignorar este correo de forma segura.
                  </p>
                  <div style="text-align: center; padding: 30px 0;">
                    <a href="${url}" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                      Restablecer Contraseña
                    </a>
                  </div>
                  <p style="color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                    <span style="color: #2563EB; word-break: break-all;">${url}</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px;">
                  © 2026 SonriAndes - Clínica Dental Digital.<br>
                  Este es un correo automático, por favor no lo respondas.
                </td>
              </tr>
            </table>
          </div>
        `,
      });

      if (error) {
        this.logger.error('Error de Resend:', error);
        return;
      }
      this.logger.log(`Correo enviado con éxito a ${user.email} (ID: ${data?.id})`);
    } catch (error) {
      this.logger.error('Error crítico:', error);
    }
  }
}