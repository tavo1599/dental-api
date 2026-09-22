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

  /** Datos de envio comunes, para no repetirlos en cada correo. */
  private fromAddress(): string {
    const configurado =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'SonriAndes <notificaciones@sonriandes.com>';
    return configurado.replace(/['"]/g, '').trim();
  }

  /**
   * Codigo para transferir la titularidad de la clinica. Va al correo del
   * titular ACTUAL: quien controle ese correo es quien autoriza el cambio.
   */
  async sendAdminTransferCode(currentAdmin: User, target: User, code: string) {
    if (!this.resend) {
      this.logger.error('Resend no está inicializado.');
      return;
    }
    try {
      await this.resend.emails.send({
        from: this.fromAddress(),
        to: [currentAdmin.email],
        replyTo: 'dentalsoft9@gmail.com',
        subject: '🔐 Código para transferir la administración - SonriAndes',
        html: `
          <div style="background-color:#f3f4f6;padding:40px 10px;font-family:sans-serif;">
            <table align="center" width="100%" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
              <tr><td style="padding:32px;">
                <h2 style="margin:0 0 8px;color:#111827;">Transferencia de administración</h2>
                <p style="color:#4b5563;line-height:1.6;">
                  Has solicitado entregar la administración de tu clínica a
                  <strong>${target.fullName}</strong>. Si lo confirmas, esa persona
                  pasará a ser el titular y tú quedarás como dentista.
                </p>
                <p style="color:#4b5563;">Tu código de verificación es:</p>
                <div style="text-align:center;margin:24px 0;">
                  <span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;color:#0f172a;background:#f1f5f9;padding:16px 24px;border-radius:12px;">${code}</span>
                </div>
                <p style="color:#6b7280;font-size:13px;line-height:1.6;">
                  Caduca en 15 minutos.
                  <strong>Si no has pedido esto, ignora el correo y cambia tu contraseña:</strong>
                  alguien con acceso a tu cuenta está intentando entregar tu clínica.
                </p>
              </td></tr>
            </table>
          </div>`,
      });
    } catch (error) {
      this.logger.error('Error enviando el código de transferencia', error);
    }
  }

  /** Aviso a ambas partes una vez hecha la transferencia. */
  async sendAdminTransferDone(
    previousAdmin: User | null,
    newAdmin: User,
    forced: boolean,
  ) {
    if (!this.resend) return;

    const destinatarios = [newAdmin.email];
    if (previousAdmin?.email) destinatarios.push(previousAdmin.email);

    const motivo = forced
      ? 'La transferencia fue realizada por el equipo de soporte a petición de la clínica.'
      : 'La transferencia fue confirmada por el titular anterior.';

    try {
      await this.resend.emails.send({
        from: this.fromAddress(),
        to: destinatarios,
        replyTo: 'dentalsoft9@gmail.com',
        subject: '✅ Cambio de administrador - SonriAndes',
        html: `
          <div style="background-color:#f3f4f6;padding:40px 10px;font-family:sans-serif;">
            <table align="center" width="100%" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
              <tr><td style="padding:32px;">
                <h2 style="margin:0 0 8px;color:#111827;">Cambio de administrador</h2>
                <p style="color:#4b5563;line-height:1.6;">
                  <strong>${newAdmin.fullName}</strong> es ahora el administrador de la clínica.
                  ${previousAdmin ? `<strong>${previousAdmin.fullName}</strong> pasa a ser dentista y conserva su agenda y sus pacientes.` : ''}
                </p>
                <p style="color:#6b7280;font-size:13px;">${motivo}</p>
                <p style="color:#6b7280;font-size:13px;">
                  Si no reconoces este cambio, contacta con soporte de inmediato.
                </p>
              </td></tr>
            </table>
          </div>`,
      });
    } catch (error) {
      this.logger.error('Error enviando el aviso de transferencia', error);
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
    let fromConfig = this.configService.get<string>('RESEND_FROM_EMAIL') || 'SonriAndes <notificaciones@sonriandes.com>';
    fromConfig = fromConfig.replace(/['"]/g, '').trim();

    try {
      const { data, error } = await this.resend.emails.send({
        from: fromConfig,
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

  // ==========================================================================
  // AVISOS DE COBRO
  //
  // Los manda el proceso diario de suscripciones. Devuelven true solo si el
  // correo salio: quien llama usa ese dato para no dar por avisada a una
  // clinica a la que en realidad no le llego nada.
  // ==========================================================================

  /**
   * Recordatorio antes de que se corte el servicio. Se usa tanto para el aviso
   * previo como para el del mismo dia del vencimiento; cambia el tono segun
   * los dias que falten.
   */
  async sendPaymentReminder(
    clinicName: string,
    to: string,
    dueDate: string,
    daysRemaining: number,
    graceDays: number,
  ): Promise<boolean> {
    const venceHoy = daysRemaining <= 0;
    const titulo = venceHoy
      ? 'Tu pago vence hoy'
      : `Tu pago vence en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`;
    const cuerpo = venceHoy
      ? `Hoy vence el pago de <strong>${clinicName}</strong>. Tienes ${graceDays} días
         de margen para regularizarlo; pasado ese plazo la cuenta se desactiva y
         el equipo no podrá entrar al sistema.`
      : `El pago de <strong>${clinicName}</strong> vence el <strong>${dueDate}</strong>.
         Te avisamos con tiempo para que no se te pase.`;

    return this.sendBillingEmail(
      to,
      venceHoy ? `⚠️ ${titulo} - SonriAndes` : `${titulo} - SonriAndes`,
      titulo,
      cuerpo,
      venceHoy ? '#b45309' : '#0f172a',
      dueDate,
    );
  }

  /**
   * La cuenta ya se desactivo. Este es el correo que de verdad importa que
   * llegue: es el unico aviso de por que dejo de funcionar el sistema.
   */
  async sendAccountInactivated(
    clinicName: string,
    to: string,
    dueDate: string,
  ): Promise<boolean> {
    return this.sendBillingEmail(
      to,
      '🔴 Cuenta desactivada por falta de pago - SonriAndes',
      'Cuenta desactivada',
      `La cuenta de <strong>${clinicName}</strong> se desactivó por el pago pendiente
       del <strong>${dueDate}</strong>. Nadie de tu equipo puede entrar al sistema
       mientras siga así.<br><br>
       <strong>No se ha borrado nada.</strong> Tus pacientes, historias e imágenes
       siguen intactos: en cuanto se registre el pago vuelves a entrar con todo
       como lo dejaste.`,
      '#b91c1c',
      dueDate,
    );
  }

  /** Lo que comparten los tres correos de cobro, para no repetir el HTML. */
  private async sendBillingEmail(
    to: string,
    subject: string,
    heading: string,
    bodyHtml: string,
    accent: string,
    dueDate: string,
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`Sin Resend configurado: no se avisó a ${to} (${subject}).`);
      return false;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress(),
        to: [to],
        replyTo: 'dentalsoft9@gmail.com',
        subject,
        html: `
          <div style="background-color:#f3f4f6;padding:40px 10px;font-family:sans-serif;">
            <table align="center" width="100%" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
              <tr><td style="height:6px;background:${accent};"></td></tr>
              <tr><td style="padding:32px;">
                <h2 style="margin:0 0 16px;color:${accent};">${heading}</h2>
                <p style="color:#4b5563;line-height:1.7;">${bodyHtml}</p>
                <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:10px;">
                  <span style="color:#64748b;font-size:13px;">Fecha de vencimiento</span><br>
                  <strong style="color:#0f172a;font-size:17px;">${dueDate}</strong>
                </div>
                <p style="color:#6b7280;font-size:13px;line-height:1.6;">
                  Para regularizar el pago responde a este correo o escríbenos a
                  <a href="mailto:dentalsoft9@gmail.com" style="color:#0284c7;">dentalsoft9@gmail.com</a>.
                </p>
              </td></tr>
            </table>
          </div>`,
      });

      if (error) {
        this.logger.error(`Resend rechazó el aviso de cobro a ${to}`, error);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Error enviando el aviso de cobro a ${to}`, error);
      return false;
    }
  }
}