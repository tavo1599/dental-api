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
    // 1. Genera el HTML (que ahora incluye el placeholder)
    const htmlContent = await this.consentService.generate(templateId, patientId, doctor);
    const patient = await this.patientRepository.findOneBy({ id: patientId });

    // 2. Crea el HTML que reemplazará al placeholder (solo la imagen)
    const signatureImgHtml = `<img src="data:image/png;base64,${signatureBase64}" alt="Firma del Paciente" style="height: 80px; display: block; margin: 0 auto;"/>`;

    // 3. Define la expresión regular para buscar el placeholder
    const placeholderRegex = /<div id="patient-signature-placeholder"[\s\S]*?<\/div>/;

    // 4. Reemplaza SOLO el placeholder con la imagen de la firma
    const finalHtml = htmlContent.replace(placeholderRegex, signatureImgHtml);
    
    // 5. Genera el PDF (el resto de la lógica es la misma)
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