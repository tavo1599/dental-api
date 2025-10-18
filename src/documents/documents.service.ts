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
    const newDoc = this.docRepository.create({
      fileName: file.originalname,
      filePath: file.path, // Esto ya incluye "uploads/documents/..."
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

  // --- FUNCIÓN 'createSignedConsent' CORREGIDA ---
  async createSignedConsent(
    patientId: string,
    tenantId: string,
    doctor: User,
    templateId: string,
    signatureBase64: string,
  ) {
    const htmlContent = await this.consentService.generate(templateId, patientId, doctor);
    const patient = await this.patientRepository.findOneBy({ id: patientId });

    // ... (Lógica para estampar la firma en el HTML)
    const signatureHtml = `
      <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; text-align: left;">
        <img src="data:image/png;base64,${signatureBase64}" alt="Firma del Paciente" style="height: 80px;"/>
        <p style="margin: 0;">_________________________</p>
        <p style="margin: 0; font-weight: bold;">${patient.fullName}</p>
        <p style="margin: 0; font-size: 12px;">DNI: ${patient.dni}</p>
        <p style="margin-top: 4px;">Paciente o Apoderado</p>
      </div>
    `;
    const finalHtml = htmlContent.replace('</body>', `${signatureHtml}</body>`);
    
    // ... (Lógica para generar el PDF)
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // --- ESTA ES LA CORRECCIÓN CLAVE ---
    const fileName = `Consentimiento_Firmado_${patient.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
    // 1. Define la ruta relativa DENTRO de 'uploads'
    const relativeFilePath = path.join('documents', fileName);
    // 2. Define la ruta completa en el disco para guardarlo
    const fullPath = path.join(process.cwd(), 'uploads', relativeFilePath);
    // 3. Define la ruta que se guardará en la BD (incluyendo 'uploads')
    const dbPath = path.join('uploads', relativeFilePath).replace(/\\/g, '/'); // Asegura formato URL
    // --- FIN DE LA CORRECCIÓN ---

    try {
      await fs.writeFile(fullPath, pdfBuffer);
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar el archivo PDF.');
    }

    const newDocument = this.docRepository.create({
      fileName: fileName,
      filePath: dbPath, // <-- Guarda la ruta completa con 'uploads/'
      fileType: 'application/pdf',
      patient: { id: patientId },
      tenant: { id: tenantId },
    });

    return this.docRepository.save(newDocument);
  }
}