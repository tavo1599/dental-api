import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentTemplate } from './entities/consent-template.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';

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
    const patient = await this.patientRepository.findOneBy({ id: patientId });

    if (!template || !patient) {
      throw new NotFoundException('Plantilla o paciente no encontrado.');
    }

    let content = template.content;
    const clinicName = doctor.tenant.name;
    const currentDate = new Date().toLocaleDateString('es-PE', { dateStyle: 'long' });
    
    content = content.replace(/{{patientName}}/g, patient.fullName);
    content = content.replace(/{{patientDni}}/g, patient.dni);
    content = content.replace(/{{clinicName}}/g, clinicName);
    content = content.replace(/{{doctorName}}/g, doctor.fullName);
    content = content.replace(/{{currentDate}}/g, currentDate);

    return this.getHtmlWrapper(template.title, content, clinicName);
  }
  
  private getHtmlWrapper(title: string, content: string, clinicName: string): string {
    return `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; margin: 40px; }
            h1 { color: #333; text-align: center; }
            .header { text-align: center; margin-bottom: 40px; }
            .content { white-space: pre-wrap; line-height: 1.6; }
            .signatures { margin-top: 80px; display: flex; justify-content: space-around; }
            .signature-box { text-align: center; width: 40%; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${clinicName}</h2>
          </div>
          <h1>${title}</h1>
          <div class="content">${content}</div>
          <div class="signatures">
            <div class="signature-box">
              <p>_________________________</p>
              <p>Firma del Paciente/Apoderado</p>
            </div>
            <div class="signature-box">
              <p>_________________________</p>
              <p>Firma del Profesional</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}