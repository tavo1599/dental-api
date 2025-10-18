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
    // Esta función está bien: file.path es 'uploads/documents/archivo.docx'
    // dbPath se convierte en 'documents/archivo.docx'
    const dbPath = file.path.replace('uploads/', '').replace(/\\/g, '/');
    
    const newDoc = this.docRepository.create({
      fileName: file.originalname,
      filePath: dbPath, // Guarda la ruta limpia
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
    
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // --- CORRECCIÓN DE RUTA ---
    const fileName = `Consentimiento_Firmado_${patient.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // 1. Define la ruta que se guardará en la BD (ej: 'documents/archivo.pdf')
    const dbPath = path.join('documents', fileName).replace(/\\/g, '/');
    
    // 2. Define la ruta física completa donde se guarda en el disco (ej: '/app/uploads/documents/archivo.pdf')
    const fullPath = path.join(process.cwd(), 'uploads', dbPath);
    // --- FIN DE LA CORRECCIÓN ---

    try {
      // Aseguramos que la carpeta exista antes de escribir
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, pdfBuffer);
    } catch (error) {
      console.error('Error al guardar el archivo PDF:', error); // Añadimos un log
      throw new InternalServerErrorException('Error al guardar el archivo PDF.');
    }

    const newDocument = this.docRepository.create({
      fileName: fileName,
      filePath: dbPath, // <-- Guarda la ruta limpia
      fileType: 'application/pdf',
      patient: { id: patientId },
      tenant: { id: tenantId },
    });

    return this.docRepository.save(newDocument);
  }
}