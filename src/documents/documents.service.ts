import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientDocument } from './entities/patient-document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly docRepository: Repository<PatientDocument>,
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
}