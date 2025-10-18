import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConsentTemplate } from './entities/consent-template.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateConsentTemplateDto } from './dto/create-consent-template.dto';
import { UpdateConsentTemplateDto } from './dto/update-consent-template.dto';
import { User } from '../users/entities/user.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class ConsentTemplatesService {
  constructor(
    @InjectRepository(ConsentTemplate)
    private readonly templateRepository: Repository<ConsentTemplate>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async findAll(tenantId: string) {
    return this.templateRepository.find({
      where: [
        { tenant: { id: tenantId } },
        { tenant: IsNull() },
      ],
      relations: ['tenant'],
      order: { category: 'ASC', title: 'ASC' },
    });
  }

  async create(createDto: CreateConsentTemplateDto, tenantId: string | null) {
    const templateData: Partial<ConsentTemplate> = {
      ...createDto,
    };
    if (tenantId) {
      templateData.tenant = { id: tenantId } as Tenant;
    }
    const newTemplate = this.templateRepository.create(templateData);
    return this.templateRepository.save(newTemplate);
  }

  async update(id: string, updateDto: UpdateConsentTemplateDto, tenantId: string) {
    const template = await this.templateRepository.findOneBy({ id, tenant: { id: tenantId } });
    if (!template) {
      throw new NotFoundException('Plantilla no encontrada o no pertenece a esta clínica.');
    }
    Object.assign(template, updateDto);
    return this.templateRepository.save(template);
  }

  async remove(id: string, tenantId: string) {
    const result = await this.templateRepository.delete({ id, tenant: { id: tenantId } });
    if (result.affected === 0) {
      throw new NotFoundException('Plantilla no encontrada o no pertenece a esta clínica.');
    }
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
    
    let logoDataUri = null;
    if (clinic.logoUrl) {
      try {
        const logoPath = path.join(process.cwd(), 'uploads', clinic.logoUrl);
        const imageBuffer = await fs.readFile(logoPath);
        logoDataUri = `data:image/webp;base64,${imageBuffer.toString('base64')}`;
      } catch (error) {
        console.error('Error al leer el archivo del logo:', error);
      }
    }
    
    let content = template.content;
    content = content.replace(/{{patientName}}/g, patient.fullName);
    content = content.replace(/{{patientDni}}/g, patient.dni);
    content = content.replace(/{{clinicName}}/g, clinic.name);
    content = content.replace(/{{doctorName}}/g, doctor.fullName);
    content = content.replace(/{{currentDate}}/g, currentDate);

    // Ahora pasamos el paciente y el doctor a la función que genera el HTML
    return this.getHtmlWrapper(template.title, content, clinic, logoDataUri, patient, doctor);
  }
  
  // --- FUNCIÓN 'getHtmlWrapper' CORREGIDA ---
  private getHtmlWrapper(title: string, content: string, clinic: any, logoDataUri: string | null, patient: Patient, doctor: User): string {
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

    // --- CORRECCIÓN CLAVE AQUÍ ---
    // Añadimos el id="signature-section" al div principal
    const signaturesHtml = `
      <div id="signature-section" style="margin-top: 80px; display: flex; justify-content: space-around; align-items: flex-start; page-break-inside: avoid;">
        <div style="text-align: center; width: 45%;">
          <div style="border-bottom: 1px solid #333; height: 60px;"></div>
          <p style="margin-top: 8px; margin-bottom: 0; font-weight: bold;">${patient.fullName}</p>
          <p style="margin: 0; font-size: 12px;">DNI: ${patient.dni}</p>
          <p style="margin-top: 4px;">Paciente o Apoderado</p>
        </div>
        <div style="text-align: center; width: 45%;">
          <div style="border-bottom: 1px solid #333; height: 60px;"></div>
          <p style="margin-top: 8px; margin-bottom: 0; font-weight: bold;">${doctor.fullName}</p>
          <p style="margin-top: 4px;">Profesional Tratante (Firma y Sello)</p>
        </div>
      </div>
    `;
    // --- FIN DE LA CORRECCIÓN ---

    return `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #333; }
            h2 { font-size: 20px; text-align: center; margin-bottom: 2rem; }
            .content { white-space: pre-wrap; line-height: 1.6; }
          </style>
        </head>
        <body>
          ${headerHtml}
          <h2>${title}</h2>
          <div class="content">${content}</div>
          ${signaturesHtml}
        </body>
      </html>
    `;
  }
}