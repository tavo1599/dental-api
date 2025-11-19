import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
// 1. Importamos el Servicio de Pacientes
import { PatientsService } from '../patients/patients.service'; 

@Injectable()
export class ClinicalHistoryService {
  constructor(
    @InjectRepository(ClinicalHistoryEntry)
    private readonly historyRepository: Repository<ClinicalHistoryEntry>,
    // 2. Inyección con forwardRef para evitar dependencias circulares
    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,
  ) {}

  // --- MÉTODO CREATE (Mantiene tu firma de 4 argumentos) ---
  async create(
    createDto: CreateClinicalHistoryEntryDto,
    patientId: string,
    userId: string,
    tenantId: string,
  ) {
    // 1. Verificar paciente (Tu lógica original)
    await this.patientsService.findOne(patientId, tenantId);

    // 2. FIX DE SEGURIDAD CRÍTICO: Limpiar fecha vacía "" -> null
    // Esto evita el error "invalid input syntax for type timestamp: """
    const sanitizedDate = 
      (!createDto.nextAppointmentDate || createDto.nextAppointmentDate === '') 
        ? null 
        : createDto.nextAppointmentDate;
    
    const sanitizedPlan = 
      (!createDto.nextAppointmentPlan || createDto.nextAppointmentPlan === '')
        ? null
        : createDto.nextAppointmentPlan;

    // 3. Crear entidad usando los datos limpios
    const newEntry = this.historyRepository.create({
      ...createDto,
      nextAppointmentDate: sanitizedDate, // Usamos el valor limpio (null o fecha válida)
      nextAppointmentPlan: sanitizedPlan,
      patient: { id: patientId },
      user: { id: userId },
      tenant: { id: tenantId },
    });

    return this.historyRepository.save(newEntry);
  }

  // --- MÉTODO FIND ALL (Mantiene tu nombre original) ---
  async findAllForPatient(patientId: string, tenantId: string) {
    await this.patientsService.findOne(patientId, tenantId);

    return this.historyRepository.find({
      where: { patient: { id: patientId } },
      order: { entryDate: 'DESC' },
      relations: ['user'],
    });
  }

  // --- NUEVO: MÉTODO UPDATE (Con limpieza de datos) ---
  async update(id: string, updateDto: any) {
    const entry = await this.historyRepository.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Entrada de historial ${id} no encontrada`);

    // FIX DE SEGURIDAD TAMBIÉN AQUÍ
    if ('nextAppointmentDate' in updateDto) {
      if (!updateDto.nextAppointmentDate || updateDto.nextAppointmentDate === '') {
        updateDto.nextAppointmentDate = null;
      }
    }
    
    if ('nextAppointmentPlan' in updateDto) {
      if (!updateDto.nextAppointmentPlan || updateDto.nextAppointmentPlan === '') {
        updateDto.nextAppointmentPlan = null;
      }
    }

    const updatedEntry = this.historyRepository.merge(entry, updateDto);
    return this.historyRepository.save(updatedEntry);
  }

  // --- NUEVO: MÉTODO REMOVE ---
  async remove(id: string) {
    const entry = await this.historyRepository.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Entrada de historial ${id} no encontrada`);
    return this.historyRepository.remove(entry);
  }
}