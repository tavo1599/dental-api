import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientDocument } from './entities/patient-document.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ConsentTemplatesService } from '../consent-templates/consent-templates.service'; // <-- 1. Importa el servicio
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
    private readonly patientRepository: Repository<Patient>, // <-- 2. Inyecta PatientRepository
    private readonly consentService: ConsentTemplatesService, // <-- 3. Inyecta ConsentTemplatesService
  ) {}
  async saveDocument(file: Express.Multer.File, patientId: string, tenantId: string) {
    const newDoc = this.docRepository.create({
      fileName: file.originalname,
      filePath: file.path,
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
    signatureBase64: string, // La firma como texto
  ) {
    // 1. Obtiene el HTML del consentimiento ya rellenado
    const htmlContent = await this.consentService.generate(templateId, patientId, doctor);
    const patient = await this.patientRepository.findOneBy({ id: patientId });

    // 2. Prepara el HTML final, "estampando" la firma al final del documento
    const signatureHtml = `
      <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; text-align: left;">
        <img src="data:image/png;base64,${signatureBase64}" alt="Firma del Paciente" style="height: 80px;"/>
        <p style="margin: 0;">_________________________</p>
        <p style="margin: 0; font-weight: bold;">${patient.fullName}</p>
        <p style="margin: 0; font-size: 12px;">DNI: ${patient.dni}</p>
        <p style="margin-top: 4px;">Paciente o Apoderado</p>
      </div>
    `;

    // Reemplazamos </body> con la firma + </body>
    const finalHtml = htmlContent.replace('</body>', `${signatureHtml}</body>`);

    // 3. Genera el PDF a partir del HTML final
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // 4. Define un nombre y ruta para el archivo
    const fileName = `Consentimiento_Firmado_${patient.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
    const filePath = path.join('documents', fileName);
    const fullPath = path.join(process.cwd(), 'uploads', filePath);

    // 5. Guarda el PDF en el disco
    try {
      await fs.writeFile(fullPath, pdfBuffer);
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar el archivo PDF.');
    }

    // 6. Guarda el registro en la base de datos
    const newDocument = this.docRepository.create({
      fileName: fileName,
      filePath: filePath,
      fileType: 'application/pdf',
      patient: { id: patientId },
      tenant: { id: tenantId },
    });

    return this.docRepository.save(newDocument);
  }

}