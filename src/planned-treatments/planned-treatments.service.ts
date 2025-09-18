import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlannedTreatment } from './entities/planned-treatment.entity';
import { CreatePlannedTreatmentDto } from './dto/create-planned-treatment.dto';

@Injectable()
export class PlannedTreatmentsService {
  constructor(
    @InjectRepository(PlannedTreatment)
    private readonly plannedTreatmentRepository: Repository<PlannedTreatment>,
  ) {}

  // Crea un nuevo tratamiento planeado
  create(createDto: CreatePlannedTreatmentDto, tenantId: string) {
    const newPlan = this.plannedTreatmentRepository.create({
      toothSurfaceState: { id: createDto.toothSurfaceStateId },
      treatment: { id: createDto.treatmentId },
      patient: { id: createDto.patientId },
      tenant: { id: tenantId },
    });
    return this.plannedTreatmentRepository.save(newPlan);
  }

  // Encuentra todos los tratamientos planeados para un paciente
  findAllForPatient(patientId: string, tenantId: string) {
    return this.plannedTreatmentRepository.find({
      where: {
        patient: { id: patientId },
        tenant: { id: tenantId },
      },
      relations: ['treatment', 'toothSurfaceState'], // Carga la info del tratamiento y la superficie
    });
  }

  // Elimina un tratamiento planeado
  remove(id: string) {
    return this.plannedTreatmentRepository.delete(id);
  }
}