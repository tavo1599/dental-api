import { Injectable, NotFoundException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
import { PatientsService } from '../patients/patients.service'; // <-- 1. Importa el Servicio de Pacientes

@Injectable()
export class ClinicalHistoryService {
  constructor(
    @InjectRepository(ClinicalHistoryEntry)
    private readonly historyRepository: Repository<ClinicalHistoryEntry>,
    // 2. Inyecta el PatientsService en lugar del PatientRepository
    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,
  ) {}

  // 3. Ya no necesitamos el método 'verifyPatientTenant'

  async create(
    createDto: CreateClinicalHistoryEntryDto,
    patientId: string,
    userId: string,
    tenantId: string,
  ) {
    // 4. Usamos el patientsService para verificar el paciente
    await this.patientsService.findOne(patientId, tenantId);

    const newEntry = this.historyRepository.create({
      ...createDto,
      patient: { id: patientId },
      user: { id: userId },
      tenant: { id: tenantId },
    });

    return this.historyRepository.save(newEntry);
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    // 4. Usamos el patientsService para verificar el paciente
    await this.patientsService.findOne(patientId, tenantId);

    return this.historyRepository.find({
      where: { patient: { id: patientId } },
      order: { entryDate: 'DESC' },
      relations: ['user'],
    });
  }
}