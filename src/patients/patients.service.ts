import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { OdontopediatricHistory } from './entities/odontopediatric-history.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { UpdateOdontopediatricHistoryDto } from './dto/update-odontopediatric-history.dto';
import { OrthodonticHistory } from './entities/orthodontic-history.entity';
import { UpdateOrthodonticHistoryDto } from './dto/update-orthodontic-history.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(MedicalHistory) // Solo inyectamos Patient y MedicalHistory
    private readonly medicalHistoryRepository: Repository<MedicalHistory>,
    @InjectRepository(OdontopediatricHistory) // <-- 3. Inyecta el nuevo repositorio
    private readonly odontopediatricHistoryRepository: Repository<OdontopediatricHistory>,
    @InjectRepository(OrthodonticHistory)
    private readonly orthodonticHistoryRepository: Repository<OrthodonticHistory>,
  ) {}

  async create(createPatientDto: CreatePatientDto, tenantId: string) {
    const newPatient = this.patientRepository.create({
      ...createPatientDto,
      tenant: { id: tenantId },
    });
    const savedPatient = await this.patientRepository.save(newPatient);

    const newMedicalHistory = this.medicalHistoryRepository.create({
      patient: savedPatient,
    });
    await this.medicalHistoryRepository.save(newMedicalHistory);

    const newPediatricHistory = this.odontopediatricHistoryRepository.create({
      patient: savedPatient,
    });
    await this.odontopediatricHistoryRepository.save(newPediatricHistory);

    return savedPatient;
  }

  async findAll(tenantId: string) {
    return this.patientRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['medicalHistory', 'odontopediatricHistory'], 
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${id}" not found`);
    }
    return patient;
  }
  
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

  async getOdontopediatricHistory(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, tenant: { id: tenantId } },
      relations: ['odontopediatricHistory'],
    });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }
    return patient.odontopediatricHistory;
  }

  async updateOdontopediatricHistory(patientId: string, tenantId: string, dto: UpdateOdontopediatricHistoryDto) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, tenant: { id: tenantId } },
      relations: ['odontopediatricHistory'],
    });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    let history = patient.odontopediatricHistory;
    if (!history) {
      history = this.odontopediatricHistoryRepository.create({ patient });
    }

    Object.assign(history, dto);
    return this.odontopediatricHistoryRepository.save(history);
  }

  async getOrthodonticHistory(patientId: string, tenantId: string): Promise<OrthodonticHistory> {
    // Primero, verificamos que el paciente exista y pertenezca al tenant
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, tenant: { id: tenantId } },
      relations: ['orthodonticHistory'], // <-- Cargamos la relación
    });

    if (!patient) {
      throw new NotFoundException(`Paciente con ID ${patientId} no encontrado.`);
    }

    // patient.orthodonticHistory puede ser null si aún no se ha creado
    return patient.orthodonticHistory;
  }

  /**
   * Actualiza o crea la anamnesis de ortodoncia de un paciente.
   * Esta lógica "upsert" (update/insert) es la más robusta.
   */
  async updateOrthodonticHistory(
    patientId: string,
    tenantId: string,
    dto: UpdateOrthodonticHistoryDto,
  ): Promise<OrthodonticHistory> {
    
    // 1. Validar que el paciente existe y pertenece al tenant
    const patient = await this.patientRepository.findOneBy({ 
      id: patientId, 
      tenant: { id: tenantId } 
    });

    if (!patient) {
      throw new NotFoundException(`Paciente con ID ${patientId} no encontrado.`);
    }

    // 2. Buscar si ya existe una anamnesis para este paciente
    let history = await this.orthodonticHistoryRepository.findOne({
      where: { patient: { id: patientId } },
    });

    if (!history) {
      // 3.A. Si NO existe: creamos una nueva instancia
      history = this.orthodonticHistoryRepository.create(dto);
      history.patient = patient; // <-- La vinculamos al paciente
    } else {
      // 3.B. Si SÍ existe: fusionamos los cambios del DTO
      // merge(entidad_existente, datos_nuevos)
      history = this.orthodonticHistoryRepository.merge(history, dto);
    }

    // 4. Guardamos la entidad (sea nueva o actualizada)
    return this.orthodonticHistoryRepository.save(history);
  }

}