import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientDocument } from './entities/patient-document.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ConsentTemplatesService } from '../consent-templates/consent-templates.service';
import { User } from '../users/entities/user.entity';
import * as puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

// --- IMPORTACIONES R2 (CLOUD STORAGE) ---
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/r2.config';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class DocumentsService {

  constructor(
    @InjectRepository(PatientDocument)
    private readonly docRepository: Repository<PatientDocument>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly consentService: ConsentTemplatesService,
  ) {}

  // --- HELPER: Subir Buffer a Cloudflare R2 ---
  private async uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key, 
        Body: buffer,
        ContentType: mimeType,
        // ESTA LÍNEA ES IMPORTANTE: Fuerza al navegador a mostrar el archivo
        ContentDisposition: 'inline', 
      });

      await r2Client.send(command);

      // Retornamos la URL pública
      return `${R2_PUBLIC_URL}/${key}`;
    } catch (error) {
      console.error('Error interno subiendo a R2:', error);
      throw error;
    }
  }

  // 1. SUBIDA DE DOCUMENTOS
  async saveDocument(file: Express.Multer.File, patientId: string, tenantId: string) {
    if (!file) throw new BadRequestException('No se proporcionó ningún archivo.');

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    // Ruta organizada: tenants/{tenantId}/patients/{patientId}/documents/...
    const cloudPath = `tenants/${tenantId}/patients/${patientId}/documents/${fileName}`;

    try {
      const publicUrl = await this.uploadToR2(file.buffer, cloudPath, file.mimetype);

      const newDoc = this.docRepository.create({
        fileName: file.originalname,
        filePath: publicUrl,
        fileType: file.mimetype,
        patient: { id: patientId },
        tenant: { id: tenantId },
      });

      return this.docRepository.save(newDoc);
    } catch (error) {
      console.error('Error subiendo a R2:', error);
      throw new InternalServerErrorException('Error al subir el archivo a la nube.');
    }
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    return this.docRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
      // order: { createdAt: 'DESC' } // Descomenta si tu entidad tiene este campo
    });
  }

  // 2. GENERACIÓN DE CONSENTIMIENTO
  async createSignedConsent(
    patientId: string,
    tenantId: string,
    doctor: User,
    templateId: string,
    signatureBase64: string,
  ) {
    // A. Generar HTML
    const htmlContent = await this.consentService.generate(templateId, patientId, doctor);
    const patient = await this.patientRepository.findOneBy({ id: patientId });

    const signatureImgHtml = `<img src="data:image/png;base64,${signatureBase64}" alt="Firma del Paciente" style="height: 80px; display: block; margin: 0 auto;"/>`;
    const placeholderRegex = /<div id="patient-signature-placeholder"[\s\S]*?<\/div>/;
    const finalHtml = htmlContent.replace(placeholderRegex, signatureImgHtml);
    
    // B. Generar PDF en memoria
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true 
    });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // C. Subir a R2
    const fileName = `Consentimiento_Firmado_${patient.dni}_${new Date().getTime()}.pdf`;
    const cloudPath = `tenants/${tenantId}/patients/${patientId}/consents/${fileName}`;

    try {
      // Convertir Uint8Array a Buffer
      const buffer = Buffer.from(pdfBuffer);
      // Especificar 'application/pdf' es clave para que se vea bien
      const publicUrl = await this.uploadToR2(buffer, cloudPath, 'application/pdf');

      const newDocument = this.docRepository.create({
        fileName: fileName,
        filePath: publicUrl,
        fileType: 'application/pdf',
        patient: { id: patientId },
        tenant: { id: tenantId },
      });

      return this.docRepository.save(newDocument);

    } catch (error) {
      console.error('Error guardando consentimiento en R2:', error);
      throw new InternalServerErrorException('Error al guardar el consentimiento firmado.');
    }
  }

  // 3. ELIMINAR
  async remove(documentId: string, tenantId: string) {
    const document = await this.docRepository.findOneBy({ 
      id: documentId, 
      tenant: { id: tenantId } 
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado o no pertenece a esta clínica.');
    }

    try {
      // Si la URL es de R2, intentamos borrar el objeto de la nube
      if (document.filePath.startsWith(R2_PUBLIC_URL)) {
        // Quitamos el dominio para obtener la Key relativa
        let objectKey = document.filePath.replace(R2_PUBLIC_URL, '');
        if (objectKey.startsWith('/')) {
          objectKey = objectKey.substring(1);
        }

        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: objectKey,
        });
        
        await r2Client.send(deleteCommand);
      }
    } catch (error) {
      console.warn(`Error al intentar borrar archivo de R2 (${document.filePath}):`, error);
      // Continuamos para borrar el registro de la BD
    }

    await this.docRepository.remove(document);
    return { message: 'Documento eliminado con éxito.' };
  }
}