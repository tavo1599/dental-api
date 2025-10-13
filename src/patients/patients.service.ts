import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { MedicalHistory } from './entities/medical-history.entity'; // Importa la nueva entidad
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(ClinicalHistoryEntry)
    private readonly historyRepository: Repository<ClinicalHistoryEntry>,
    @InjectRepository(MedicalHistory) // 1. Inyectamos el nuevo repositorio
    private readonly medicalHistoryRepository: Repository<MedicalHistory>,
  ) {}

  async create(createPatientDto: CreatePatientDto, tenantId: string) {
    const newPatient = this.patientRepository.create({
      ...createPatientDto,
      tenant: { id: tenantId },
    });
    // 2. Guardamos el nuevo paciente
    const savedPatient = await this.patientRepository.save(newPatient);

    // 3. Creamos una entrada de historial médico vacía y la asociamos al paciente recién creado
    const newMedicalHistory = this.medicalHistoryRepository.create({
      patient: savedPatient,
    });
    await this.medicalHistoryRepository.save(newMedicalHistory);

    return savedPatient;
  }

  async findAll(tenantId: string) {
    return this.patientRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const patient = await this.patientRepository.findOne({
      // 4. Al buscar un paciente, también cargamos su historial médico
      where: { id, tenant: { id: tenantId } },
      relations: ['medicalHistory'], 
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${id}" not found`);
    }
    return patient;
  }
  
  // Mantenemos tus métodos para actualizar y borrar pacientes
  async update(id: string, updatePatientDto: UpdatePatientDto, tenantId: string) {
    const patient = await this.findOne(id, tenantId);
    const updatedPatient = this.patientRepository.merge(patient, updatePatientDto);
    return this.patientRepository.save(updatedPatient);
  }

  async remove(id: string, tenantId: string) {
    const patient = await this.findOne(id, tenantId);
    await this.patientRepository.remove(patient);
    return { message: `Patient with ID "${id}" successfully removed` };
  }

  // --- MÉTODOS PARA EL HISTORIAL MÉDICO ---
  async getMedicalHistory(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, tenant: { id: tenantId } },
      relations: ['medicalHistory'],
    });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }
    return patient.medicalHistory;
  }

  async updateMedicalHistory(patientId: string, tenantId: string, dto: UpdateMedicalHistoryDto) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, tenant: { id: tenantId } },
      relations: ['medicalHistory'],
    });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    let history = patient.medicalHistory;
    if (!history) {
      history = this.medicalHistoryRepository.create({ patient });
    }
    
    Object.assign(history, dto);
    return this.medicalHistoryRepository.save(history);
  }
}