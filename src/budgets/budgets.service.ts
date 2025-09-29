import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { Budget, BudgetStatus } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Treatment)
    private readonly treatmentRepository: Repository<Treatment>,
    @InjectRepository(BudgetItem)
    private readonly budgetItemRepository: Repository<BudgetItem>,
  ) {}

async create(createBudgetDto: CreateBudgetDto, patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOneBy({ id: patientId });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    let totalAmount = 0;
    const budgetItems: BudgetItem[] = [];

    for (const itemDto of createBudgetDto.items) {
      const treatment = await this.treatmentRepository.findOneBy({ id: itemDto.treatmentId });
      if (treatment) {
        const itemTotal = treatment.price * itemDto.quantity;
        totalAmount += itemTotal;
        
        const newBudgetItem = this.budgetItemRepository.create({
          treatment,
          quantity: itemDto.quantity,
          priceAtTimeOfBudget: treatment.price,
        });
        budgetItems.push(newBudgetItem);
      }
    }
    
    const newBudget = this.budgetRepository.create({
      patient,
      tenant: { id: tenantId },
      totalAmount,
      items: budgetItems,
    });

    return this.budgetRepository.save(newBudget);
  }


  async findAllForPatient(patientId: string, tenantId: string) {
    // Verificar que el paciente pertenezca al tenant
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new UnauthorizedException('Patient access denied');

    return this.budgetRepository.find({
        where: { patient: { id: patientId } },
        relations: ['items', 'items.treatment'], // Carga los items y los detalles del tratamiento
        order: { creationDate: 'DESC' }
    });
  }

  async updateStatus(budgetId: string, tenantId: string, newStatus: 'approved' | 'rejected') {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    budget.status = newStatus === 'approved' ? BudgetStatus.APPROVED : BudgetStatus.REJECTED;
    
    return this.budgetRepository.save(budget);
  }

  async findOne(id: string, tenantId: string) {
  const budget = await this.budgetRepository.findOne({
    where: { id, tenant: { id: tenantId } },
    // Cargamos todas las relaciones que necesitamos para la impresión
    relations: ['patient', 'tenant', 'items', 'items.treatment'],
  });

  if (!budget) {
    throw new NotFoundException(`Budget with ID "${id}" not found.`);
  }
  return budget;
}
}

