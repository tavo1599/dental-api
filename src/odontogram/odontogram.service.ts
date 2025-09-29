import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';
import { Tooth } from './entities/tooth.entity'; // Importa la nueva entidad
import { UpdateOdontogramDto } from './dto/update-odontogram.dto';

@Injectable()
export class OdontogramService {
  constructor(
    @InjectRepository(ToothSurfaceState)
    private readonly surfaceRepository: Repository<ToothSurfaceState>,
    @InjectRepository(Tooth)
    private readonly toothRepository: Repository<Tooth>,
  ) {}

  // Ahora devuelve los datos de ambas tablas
  async getOdontogram(patientId: string, tenantId: string) {
    const wholeTeeth = await this.toothRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });
    const surfaces = await this.surfaceRepository.find({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });
    return { wholeTeeth, surfaces };
  }

  async updateOdontogram(dto: UpdateOdontogramDto, patientId: string, tenantId: string) {
    for (const update of dto.updates) {
      const { toothNumber, status, surface } = update;

      if (surface) { // Actualización de superficie
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
      } else { // Actualización de diente completo
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

        // --- LÓGICA AÑADIDA ---
        // Aseguramos que también exista un registro en la superficie oclusal
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
        // --- FIN ---
      }
    }
    return this.getOdontogram(patientId, tenantId);
  }
}