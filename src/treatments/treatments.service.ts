import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Treatment } from './entities/treatment.entity';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { BudgetItem } from '../budgets/entities/budget-item.entity';

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(Treatment)
    private readonly treatmentRepository: Repository<Treatment>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemRepository: Repository<BudgetItem>,
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
    // Si existen BudgetItems que referencian este tratamiento, ponemos la FK a NULL
    // y preservamos el snapshot (treatmentName, priceAtTimeOfBudget) en los items.
    const referencingItems = await this.budgetItemRepository
      .createQueryBuilder('bi')
      .leftJoinAndSelect('bi.budget', 'b')
      .where('bi.treatment = :id', { id })
      .andWhere('b.tenant = :tenantId', { tenantId })
      .getMany();

    if (referencingItems.length > 0) {
      for (const it of referencingItems) {
        it.treatment = null;
      }
      await this.budgetItemRepository.save(referencingItems);
    }

    await this.treatmentRepository.remove(treatment);
    return { message: `Treatment with ID "${id}" successfully removed` };
  }
}