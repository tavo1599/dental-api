import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrthodonticAnamnesis } from './entities/orthodontic-anamnesis.entity';
import { UpdateOrthodonticAnamnesisDto } from './dto/update-orthodontic-anamnesis.dto';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class OrthodonticAnamnesisService {
  constructor(
    @InjectRepository(OrthodonticAnamnesis)
    private readonly orthoRepository: Repository<OrthodonticAnamnesis>,
    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,
  ) {}

  async getForPatient(patientId: string, tenantId: string) {
    await this.patientsService.findOne(patientId, tenantId);

    const record = await this.orthoRepository.findOne({
      where: { patient: { id: patientId }, tenant: { id: tenantId } },
    });

    return record;
  }

  async updateForPatient(
    updateDto: UpdateOrthodonticAnamnesisDto,
    patientId: string,
    userId: string,
    tenantId: string,
  ) {
    await this.patientsService.findOne(patientId, tenantId);

    let record = await this.orthoRepository.findOne({ where: { patient: { id: patientId }, tenant: { id: tenantId } } });

    if (!record) {
      record = this.orthoRepository.create({
        ...updateDto,
        patient: { id: patientId },
        user: { id: userId } as any,
        tenant: { id: tenantId },
      });
    } else {
      Object.assign(record, updateDto);
      record.user = { id: userId } as any;
    }

    return this.orthoRepository.save(record);
  }
}
