import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { Prescription } from './entities/prescription.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  private async verifyPatientTenant(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) {
      throw new UnauthorizedException('Access to patient denied');
    }
  }

  async create(dto: CreatePrescriptionDto, patientId: string, doctorId: string, tenantId: string) {
    await this.verifyPatientTenant(patientId, tenantId);

    const newPrescription = this.prescriptionRepository.create({
      ...dto,
      patient: { id: patientId },
      doctor: { id: doctorId },
      tenant: { id: tenantId },
    });

    return this.prescriptionRepository.save(newPrescription);
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    await this.verifyPatientTenant(patientId, tenantId);

    return this.prescriptionRepository.find({
      where: { patient: { id: patientId } },
      relations: ['doctor'],
      order: { prescriptionDate: 'DESC' },
    });
  }
}