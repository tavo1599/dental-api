import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Configura la clave de API de SendGrid al iniciar el servicio
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    sgMail.setApiKey(apiKey);
  }

  async sendPasswordResetEmail(user: User, token: string) {
    const url = `http://localhost:5173/reset-password?token=${token}`;
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    const msg = {
      to: user.email,
      from: fromEmail,
      subject: 'Recuperación de Contraseña - DentalSoft',
      html: `
        <p>Hola ${user.fullName},</p>
        <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para continuar:</p>
        <p><a href="${url}" style="padding: 10px 15px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
        <p>Si no solicitaste esto, por favor ignora este correo.</p>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Error sending email with SendGrid', error);
    }
  }
}