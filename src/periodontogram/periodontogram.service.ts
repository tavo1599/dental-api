import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { PeriodontalMeasurement } from './entities/periodontal-measurement.entity';
import { UpdatePeriodontogramDto } from './dto/update-periodontogram.dto';

@Injectable()
export class PeriodontogramService {
  constructor(
    @InjectRepository(PeriodontalMeasurement)
    private readonly measurementRepository: Repository<PeriodontalMeasurement>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  private async verifyPatientTenant(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) {
      throw new UnauthorizedException('Access to patient periodontogram denied');
    }
  }

  async getPeriodontogram(patientId: string, tenantId: string) {
    await this.verifyPatientTenant(patientId, tenantId);
    return this.measurementRepository.find({
      where: { patient: { id: patientId } },
    });
  }

  async updatePeriodontogram(dto: UpdatePeriodontogramDto, patientId: string, tenantId: string) {
    await this.verifyPatientTenant(patientId, tenantId);

    for (const update of dto.updates) {
      let measurement = await this.measurementRepository.findOneBy({
        patient: { id: patientId },
        toothNumber: update.toothNumber,
      });

      if (measurement) {
        // Si existe, actualiza los campos proporcionados
        Object.assign(measurement, update);
      } else {
        // Si no existe, lo crea
        measurement = this.measurementRepository.create({
          ...update,
          patient: { id: patientId },
          tenant: { id: tenantId },
        });
      }
      await this.measurementRepository.save(measurement);
    }

    return this.getPeriodontogram(patientId, tenantId);
  }
}