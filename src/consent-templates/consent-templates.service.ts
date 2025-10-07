import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentTemplate } from './entities/consent-template.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConsentTemplatesService {
  constructor(
    @InjectRepository(ConsentTemplate)
    private readonly templateRepository: Repository<ConsentTemplate>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly configService: ConfigService,
  ) {}

  async findAll() {
    return this.templateRepository.find();
  }

  async generate(templateId: string, patientId: string, doctor: User) {
    const template = await this.templateRepository.findOneBy({ id: templateId });
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
      relations: ['tenant'],
    });

    if (!template || !patient || !patient.tenant) {
      throw new NotFoundException('Plantilla, paciente o clínica no encontrado.');
    }

    const clinic = patient.tenant;
    const currentDate = new Date().toLocaleDateString('es-PE', { dateStyle: 'long' });
    
    // Construye la URL absoluta del logo
    const baseUrl = this.configService.get('API_BASE_URL');
    const logoUrl = clinic.logoUrl ? `${baseUrl}${clinic.logoUrl}` : null;
    
    // Reemplaza los placeholders
    let content = template.content;
    content = content.replace(/{{patientName}}/g, patient.fullName);
    content = content.replace(/{{patientDni}}/g, patient.dni);
    content = content.replace(/{{clinicName}}/g, clinic.name);
    content = content.replace(/{{doctorName}}/g, doctor.fullName);
    content = content.replace(/{{currentDate}}/g, currentDate);

    return this.getHtmlWrapper(template.title, content, clinic, logoUrl);
  }
  
  private getHtmlWrapper(title: string, content: string, clinic: any, logoUrl: string | null): string {
    const headerHtml = `
      <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #EEE; padding-bottom: 1rem; margin-bottom: 2rem;">
        <div style="max-width: 70%;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #333;">${clinic.name}</h1>
        </div>
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 80px; max-width: 30%;">` : ''}
      </header>
    `;

    return `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #333; }
            h2 { font-size: 20px; text-align: center; margin-bottom: 2rem; }
            .content { white-space: pre-wrap; line-height: 1.6; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-around; }
            .signature-box { text-align: center; width: 40%; }
          </style>
        </head>
        <body>
          ${headerHtml}
          <h2>${title}</h2>
          <div class="content">${content}</div>
          <div class="signatures">
            <div class="signature-box">
              <p style="border-top: 1px solid #333; padding-top: 8px;">Firma del Paciente/Apoderado</p>
            </div>
            <div class="signature-box">
              <p style="border-top: 1px solid #333; padding-top: 8px;">Firma del Profesional</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}