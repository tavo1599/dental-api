import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Treatment } from './entities/treatment.entity';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(Treatment)
    private readonly treatmentRepository: Repository<Treatment>,
  ) {}

  create(createDto: CreateTreatmentDto, tenantId: string) {
    const newTreatment = this.treatmentRepository.create({
      ...createDto,
      tenant: { id: tenantId },
    });
    return this.treatmentRepository.save(newTreatment);
  }

  findAll(tenantId: string) {
    return this.treatmentRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const treatment = await this.treatmentRepository.findOneBy({ id, tenant: { id: tenantId } });
    if (!treatment) {
      throw new NotFoundException(`Treatment with ID "${id}" not found`);
    }
    return treatment;
  }

  async update(id: string, updateDto: UpdateTreatmentDto, tenantId: string) {
    const treatment = await this.findOne(id, tenantId);
    const updatedTreatment = this.treatmentRepository.merge(treatment, updateDto);
    return this.treatmentRepository.save(updatedTreatment);
  }

  async remove(id: string, tenantId: string) {
    const treatment = await this.findOne(id, tenantId);
    await this.treatmentRepository.remove(treatment);
    return { message: `Treatment with ID "${id}" successfully removed` };
  }
}