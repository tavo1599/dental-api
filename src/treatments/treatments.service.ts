import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Treatment } from './entities/treatment.entity';
import { BudgetItem } from '../budgets/entities/budget-item.entity';
import { PlannedTreatment } from '../planned-treatments/entities/planned-treatment.entity';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

// Postgres: foreign_key_violation
const FK_VIOLATION = '23503';

@Injectable()
export class TreatmentsService {
  constructor(
    @InjectRepository(Treatment)
    private readonly treatmentRepository: Repository<Treatment>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemRepository: Repository<BudgetItem>,
    @InjectRepository(PlannedTreatment)
    private readonly plannedTreatmentRepository: Repository<PlannedTreatment>,
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

    try {
      await this.treatmentRepository.remove(treatment);
    } catch (error) {
      // El tratamiento sigue referenciado desde budget_items o planned_treatments.
      // Borrarlo destruiria el historial, asi que devolvemos un 409 explicando donde se usa.
      if (error instanceof QueryFailedError && (error.driverError?.code ?? (error as any).code) === FK_VIOLATION) {
        throw new ConflictException(await this.buildInUseMessage(id, treatment.name));
      }
      throw error;
    }

    return { message: `Treatment with ID "${id}" successfully removed` };
  }

  private async buildInUseMessage(id: string, name: string): Promise<string> {
    const [budgetCount, plannedCount] = await Promise.all([
      this.budgetItemRepository.count({ where: { treatment: { id } } }),
      this.plannedTreatmentRepository.count({ where: { treatment: { id } } }),
    ]);

    const usages: string[] = [];
    if (budgetCount > 0) {
      usages.push(`${budgetCount} presupuesto${budgetCount === 1 ? '' : 's'}`);
    }
    if (plannedCount > 0) {
      usages.push(`${plannedCount} tratamiento${plannedCount === 1 ? '' : 's'} planificado${plannedCount === 1 ? '' : 's'}`);
    }

    const detail = usages.length > 0 ? ` porque esta en uso en ${usages.join(' y ')}` : ' porque esta en uso';

    return `No se puede eliminar "${name}"${detail}. Puedes editar su nombre o precio, pero no borrarlo sin afectar el historial.`;
  }
}
