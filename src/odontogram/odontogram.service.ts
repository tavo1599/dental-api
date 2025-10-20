import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';
import { Tooth } from './entities/tooth.entity'; // Importa la nueva entidad
import { ToothState } from './entities/tooth-state.entity';
import { UpdateOdontogramDto } from './dto/update-odontogram.dto';
import { CreateToothStateDto } from './dto/create-tooth-state.dto';
import { PatientsService } from '../patients/patients.service';
import { ToothStatus } from '../types/tooth-status.enum';

@Injectable()
export class OdontogramService {
  constructor(
    @InjectRepository(ToothSurfaceState)
    private readonly surfaceRepository: Repository<ToothSurfaceState>,
    @InjectRepository(Tooth)
    private readonly toothRepository: Repository<Tooth>,
    @InjectRepository(ToothState) // <-- 3. Inyecta el nuevo repositorio
    private readonly toothStateRepository: Repository<ToothState>,
    private readonly patientsService: PatientsService, // Inyecta PatientsService
  ) {}

  // Ahora devuelve los datos de ambas tablas
  async getOdontogram(patientId: string, tenantId: string) {
    await this.patientsService.findOne(patientId, tenantId); // Verifica permiso

    const wholeTeeth = await this.toothRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });
    const surfaces = await this.surfaceRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });
    // 4. Busca también los estados del "Top Box"
    const toothStates = await this.toothStateRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });

    // 5. Devuelve todo junto
    return { wholeTeeth, surfaces, toothStates };
  }

async updateOdontogram(dto: UpdateOdontogramDto, patientId: string, tenantId: string) {
    for (const update of dto.updates) {
      const { toothNumber, status, surface } = update;

      if (surface) { // Actualización de superficie
        
        // Si el estado es "Sano", borramos la fila
        if (status === ToothStatus.HEALTHY) {
          await this.surfaceRepository.delete({
            patient: { id: patientId },
            toothNumber,
            surface,
          });
        } else {
          // Si no, la creamos o actualizamos (lógica antigua)
          let state = await this.surfaceRepository.findOneBy({ patient: { id: patientId }, toothNumber, surface });
          if (state) {
            state.status = status;
          } else {
            state = this.surfaceRepository.create({
              toothNumber, surface, status,
              patient: { id: patientId }, tenant: { id: tenantId },
            });
          }
          await this.surfaceRepository.save(state);
        }

      } else { // Actualización de diente completo
        
        // Si el estado es "Sano", borramos la fila
        if (status === ToothStatus.HEALTHY) {
          await this.toothRepository.delete({
            patient: { id: patientId },
            toothNumber,
          });
          // También borramos el estado 'oclusal' que se creaba automáticamente
          await this.surfaceRepository.delete({
            patient: { id: patientId },
            toothNumber,
            surface: 'occlusal',
          });
        } else {
          // Si no, la creamos o actualizamos (lógica antigua)
          let tooth = await this.toothRepository.findOneBy({ patient: { id: patientId }, toothNumber });
          if (tooth) {
            tooth.status = status;
          } else {
            tooth = this.toothRepository.create({
              toothNumber, status,
              patient: { id: patientId }, tenant: { id: tenantId },
            });
          }
          await this.toothRepository.save(tooth);
          
          let oclusalState = await this.surfaceRepository.findOneBy({ patient: { id: patientId }, toothNumber, surface: 'occlusal' });
          if (oclusalState) {
            oclusalState.status = status;
          } else {
            oclusalState = this.surfaceRepository.create({
              toothNumber, surface: 'occlusal', status,
              patient: { id: patientId }, tenant: { id: tenantId },
            });
          }
          await this.surfaceRepository.save(oclusalState);
        }
      }
    }
    return this.getOdontogram(patientId, tenantId);
  }

  async saveToothState(dto: CreateToothStateDto, patientId: string, tenantId: string) {
    await this.patientsService.findOne(patientId, tenantId);

    let existingState = await this.toothStateRepository.findOne({
      where: {
        patient: { id: patientId },
        toothNumber: dto.toothNumber,
        condition: dto.condition,
      },
    });

    if (existingState) {
      // Si existe (ej. era "Bueno" y ahora es "Malo"), lo actualiza
      Object.assign(existingState, dto);
      return this.toothStateRepository.save(existingState);
    } else {
      // Si no existe, crea uno nuevo
      const newState = this.toothStateRepository.create({
        ...dto,
        patient: { id: patientId },
        tenant: { id: tenantId },
      });
      return this.toothStateRepository.save(newState);
    }
  }

  async clearToothState(id: string, tenantId: string) {
    const result = await this.toothStateRepository.delete({
      id,
      tenant: { id: tenantId },
    });
    if (result.affected === 0) {
      throw new NotFoundException('Estado del diente no encontrado.');
    }
  }
}