import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
import { PatientsService } from '../patients/patients.service'; 

@Injectable()
export class ClinicalHistoryService {
  constructor(
    @InjectRepository(ClinicalHistoryEntry)
    private readonly historyRepository: Repository<ClinicalHistoryEntry>,
    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,
  ) {}

  // --- NUEVO: Busca recordatorios globales por fecha ---
  async findAllReminders(tenantId: string, date?: string) {
    const whereClause: any = { tenant: { id: tenantId } };
    
    // Si mandan fecha, filtramos. Si no, trae todo (cuidado con el volumen)
    if (date) {
        // Buscamos coincidencia exacta de fecha (string YYYY-MM-DD)
        // Asumiendo que guardas la fecha como string o date compatible
        whereClause.nextAppointmentDate = date; 
    } else {
        // Solo traer los que tienen alguna fecha futura definida
        // (Esto depende de tu BD, aquí un ejemplo básico para que no traiga vacíos)
        // whereClause.nextAppointmentDate = Not(IsNull()); 
    }

    return this.historyRepository.find({
      where: whereClause,
      relations: ['patient', 'user'], // Vital para que el asistente sepa el nombre del paciente y doctor
      order: { nextAppointmentDate: 'ASC' },
      take: 50 // Límite razonable
    });
  }

  // --- MÉTODOS ORIGINALES ---

  async create(
    createDto: CreateClinicalHistoryEntryDto,
    patientId: string,
    userId: string,
    tenantId: string,
  ) {
    await this.patientsService.findOne(patientId, tenantId);

    const sanitizedDate = 
      (!createDto.nextAppointmentDate || createDto.nextAppointmentDate === '') 
        ? null 
        : createDto.nextAppointmentDate;
    
    const sanitizedPlan = 
      (!createDto.nextAppointmentPlan || createDto.nextAppointmentPlan === '')
        ? null
        : createDto.nextAppointmentPlan;

    const newEntry = this.historyRepository.create({
      ...createDto,
      nextAppointmentDate: sanitizedDate,
      nextAppointmentPlan: sanitizedPlan,
      patient: { id: patientId },
      user: { id: userId },
      tenant: { id: tenantId },
    });

    return this.historyRepository.save(newEntry);
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    await this.patientsService.findOne(patientId, tenantId);

    return this.historyRepository.find({
      where: { patient: { id: patientId } },
      order: { entryDate: 'DESC' },
      relations: ['user'],
    });
  }

  async update(id: string, updateDto: any, tenantId: string) {
    // Agregamos filtro por tenant para seguridad
    const entry = await this.historyRepository.findOne({ where: { id, tenant: { id: tenantId } } });
    if (!entry) throw new NotFoundException(`Entrada de historial ${id} no encontrada`);

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

  async remove(id: string, tenantId: string) {
    // Agregamos filtro por tenant para seguridad
    const entry = await this.historyRepository.findOne({ where: { id, tenant: { id: tenantId } } });
    if (!entry) throw new NotFoundException(`Entrada de historial ${id} no encontrada`);
    return this.historyRepository.remove(entry);
  }
}