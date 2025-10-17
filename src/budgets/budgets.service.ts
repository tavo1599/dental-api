import { Injectable, NotFoundException } from '@nestjs/common';
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

  // --- MÉTODO 'create' CORREGIDO ---
  async create(createBudgetDto: CreateBudgetDto, tenantId: string, doctorId: string) {
    const { patientId, items: itemsDto } = createBudgetDto;
    
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    let totalAmount = 0;
    const budgetItems: BudgetItem[] = [];

    for (const itemDto of itemsDto) {
      const treatment = await this.treatmentRepository.findOneBy({ id: itemDto.treatmentId, tenant: { id: tenantId } });
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
      doctor: { id: doctorId }, // Ahora sí existe doctorId
      totalAmount,
      items: budgetItems,
    });

    return this.budgetRepository.save(newBudget);
  }

  async findAllForPatient(patientId: string, tenantId: string, doctorId?: string) {
    const whereCondition: any = {
      patient: { id: patientId },
      tenant: { id: tenantId },
    };
    if (doctorId) {
      whereCondition.doctor = { id: doctorId };
    }

    return this.budgetRepository.find({
      where: whereCondition,
      relations: ['items', 'items.treatment', 'doctor'],
      order: { creationDate: 'DESC' },
    });
  }

  async updateStatus(budgetId: string, tenantId: string, newStatus: BudgetStatus) {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    budget.status = newStatus;
    
    return this.budgetRepository.save(budget);
  }

  async findOne(id: string, tenantId: string) {
    const budget = await this.budgetRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['patient', 'tenant', 'items', 'items.treatment', 'doctor'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${id}" not found.`);
    }
    return budget;
  }
}