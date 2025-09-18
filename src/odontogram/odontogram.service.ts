import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { UpdateOdontogramDto } from './dto/update-odontogram.dto';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';

@Injectable()
export class OdontogramService {
  constructor(
    @InjectRepository(ToothSurfaceState)
    private readonly surfaceStateRepository: Repository<ToothSurfaceState>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  private async verifyPatientTenant(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) {
      throw new UnauthorizedException('Access to patient odontogram denied');
    }
  }

  async getOdontogram(patientId: string, tenantId: string) {
    await this.verifyPatientTenant(patientId, tenantId);
    return this.surfaceStateRepository.find({
      where: {
        patient: { id: patientId },
        tenant: { id: tenantId },
      },
    });
  }

  async updateOdontogram(dto: UpdateOdontogramDto, patientId: string, tenantId: string) {
    await this.verifyPatientTenant(patientId, tenantId);

    for (const update of dto.updates) {
      // Busca si ya existe un estado para esta superficie
      let surfaceState = await this.surfaceStateRepository.findOneBy({
        patient: { id: patientId },
        toothNumber: update.toothNumber,
        surface: update.surface,
      });

      if (surfaceState) {
        // Si existe, lo actualiza
        surfaceState.status = update.status;
      } else {
        // Si no existe, lo crea
        surfaceState = this.surfaceStateRepository.create({
          ...update,
          patient: { id: patientId },
          tenant: { id: tenantId },
        });
      }
      await this.surfaceStateRepository.save(surfaceState);
    }

    return this.getOdontogram(patientId, tenantId);
  }
}