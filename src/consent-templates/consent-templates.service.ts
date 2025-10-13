import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentTemplate } from './entities/consent-template.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import * as fs from 'fs/promises'; // Importa el sistema de archivos
import * as path from 'path';

@Injectable()
export class ConsentTemplatesService {
  constructor(
    @InjectRepository(ConsentTemplate)
    private readonly templateRepository: Repository<ConsentTemplate>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
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
    
    // --- LÓGICA DE IMAGEN INCRUSTADA ---
    let logoDataUri = null;
    if (clinic.logoUrl) {
      try {
        const logoPath = path.join(process.cwd(), 'uploads', clinic.logoUrl);
        const imageBuffer = await fs.readFile(logoPath);
        const base64Image = imageBuffer.toString('base64');
        logoDataUri = `data:image/webp;base64,${base64Image}`;
      } catch (error) {
        console.error('Error al leer el archivo del logo:', error);
      }
    }
    // --- FIN ---
    
    let content = template.content;
    content = content.replace(/{{patientName}}/g, patient.fullName);
    content = content.replace(/{{patientDni}}/g, patient.dni);
    content = content.replace(/{{clinicName}}/g, clinic.name);
    content = content.replace(/{{doctorName}}/g, doctor.fullName);
    content = content.replace(/{{currentDate}}/g, currentDate);

    return this.getHtmlWrapper(template.title, content, clinic, logoDataUri);
  }
  
  private getHtmlWrapper(title: string, content: string, clinic: any, logoDataUri: string | null): string {
    const clinicContactInfo = `
      <p style="font-size: 12px; color: #666; margin: 0;">${clinic.address || ''}</p>
      <p style="font-size: 12px; color: #666; margin: 0;">${clinic.phone || ''}</p>
      <p style="font-size: 12px; color: #666; margin: 0;">${clinic.email || ''}</p>
    `;

    const headerHtml = `
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 1rem; margin-bottom: 2rem;">
        <div>
          <h1 style="font-size: 22px; font-weight: bold; margin: 0; color: #333;">${clinic.name}</h1>
          ${clinicContactInfo}
        </div>
        ${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" style="max-height: 70px; max-width: 30%;">` : ''}
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
          </style>
        </head>
        <body>
          ${headerHtml}
          <h2>${title}</h2>
          <div class="content">${content}</div>
          </body>
      </html>
    `;
  }
}