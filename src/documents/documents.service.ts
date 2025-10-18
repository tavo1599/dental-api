import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientDocument } from './entities/patient-document.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ConsentTemplatesService } from '../consent-templates/consent-templates.service';
import { User } from '../users/entities/user.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly docRepository: Repository<PatientDocument>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly consentService: ConsentTemplatesService,
  ) {}

  async saveDocument(file: Express.Multer.File, patientId: string, tenantId: string) {
    const dbPath = file.path.replace('uploads/', '').replace(/\\/g, '/');
    
    const newDoc = this.docRepository.create({
      fileName: file.originalname,
      filePath: dbPath,
      fileType: file.mimetype,
      patient: { id: patientId },
      tenant: { id: tenantId },
    });
    return this.docRepository.save(newDoc);
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    return this.docRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });
  }

  async createSignedConsent(
    patientId: string,
    tenantId: string,
    doctor: User,
    templateId: string,
    signatureBase64: string,
  ) {
    const htmlContent = await this.consentService.generate(templateId, patientId, doctor);
    const patient = await this.patientRepository.findOneBy({ id: patientId });

    const newSignatureHtml = `
      <div id="signature-section" style="margin-top: 80px; display: flex; justify-content: space-around; align-items: flex-start; page-break-inside: avoid;">
        
        <div style="text-align: center; width: 45%;">
          <img src="data:image/png;base64,${signatureBase64}" alt="Firma del Paciente" style="height: 80px; border-bottom: 1px solid #333;"/>
          <p style="margin-top: 8px; margin-bottom: 0; font-weight: bold;">${patient.fullName}</p>
          <p style="margin: 0; font-size: 12px;">DNI: ${patient.dni}</p>
          <p style="margin-top: 4px;">Paciente o Apoderado</p>
        </div>

        <div style="text-align: center; width: 45%;">
          <div style="border-bottom: 1px solid #333; height: 80px;"></div>
          <p style="margin-top: 8px; margin-bottom: 0; font-weight: bold;">${doctor.fullName}</p>
          <p style="margin-top: 4px;">Profesional Tratante (Firma y Sello)</p>
        </div>

      </div>
    `;

    // --- CORRECCIÓN CLAVE AQUÍ ---
    // Añadimos el flag 's' al final de la RegExp
    const finalHtml = htmlContent.replace(/<div id="signature-section"[\s\S]*?<\/div>/, newSignatureHtml);
    // --- FIN DE LA CORRECCIÓN ---
    
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const fileName = `Consentimiento_Firmado_${patient.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
    const dbPath = path.join('documents', fileName).replace(/\\/g, '/');
    const fullPath = path.join(process.cwd(), 'uploads', dbPath);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, pdfBuffer);
    } catch (error) {
      console.error('Error al guardar el archivo PDF:', error);
      throw new InternalServerErrorException('Error al guardar el archivo PDF.');
    }

    const newDocument = this.docRepository.create({
      fileName: fileName,
      filePath: dbPath,
      fileType: 'application/pdf',
      patient: { id: patientId },
      tenant: { id: tenantId },
    });

    return this.docRepository.save(newDocument);
  }
}