import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';

@Injectable()
export class ClinicalHistoryService {
  constructor(
    @InjectRepository(ClinicalHistoryEntry)
    private readonly historyRepository: Repository<ClinicalHistoryEntry>,
    @InjectRepository(Patient) // Inyectamos el repo de Pacientes para verificar
    private readonly patientRepository: Repository<Patient>,
  ) {}

  // Verifica que un paciente pertenezca al tenant del usuario
  private async verifyPatientTenant(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, tenant: { id: tenantId } },
    });
    if (!patient) {
      throw new UnauthorizedException('Access to patient denied');
    }
    return patient;
  }

  async create(
    createDto: CreateClinicalHistoryEntryDto,
    patientId: string,
    userId: string,
    tenantId: string,
  ) {
    // 1. Verifica que el doctor tenga permiso para ver a este paciente
    await this.verifyPatientTenant(patientId, tenantId);

    // 2. Crea la nueva entrada del historial
    const newEntry = this.historyRepository.create({
      ...createDto,
      patient: { id: patientId },
      user: { id: userId },
      tenant: { id: tenantId },
    });

    return this.historyRepository.save(newEntry);
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    // 1. Verifica que el doctor tenga permiso para ver a este paciente
    await this.verifyPatientTenant(patientId, tenantId);

    // 2. Busca el historial, ordenado por fecha descendente
    return this.historyRepository.find({
      where: { patient: { id: patientId } },
      order: { entryDate: 'DESC' },
      relations: ['user'], // Opcional: Carga la info del doctor que hizo la entrada
    });
  }
}