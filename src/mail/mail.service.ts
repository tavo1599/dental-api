import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      console.warn('SENDGRID_API_KEY no está configurada. El envío de correos está deshabilitado.');
    }
  }

  async sendPasswordResetEmail(user: User, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = `${frontendUrl}/reset-password?token=${token}`;

    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    const msg = {
      to: user.email,
      from: fromEmail,
      subject: 'Recuperación de Contraseña - SonriAndes',
      html: `
        <p>Hola ${user.fullName},</p>
        <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para continuar:</p>
        <p><a href="${url}" style="padding: 10px 15px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
        <p>Si no solicitaste esto, por favor ignora este correo.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log('Correo de recuperación de contraseña enviado con éxito.');
    } catch (error) {
      console.error('Error al enviar correo con SendGrid:', error.response?.body);
    }
  }
}