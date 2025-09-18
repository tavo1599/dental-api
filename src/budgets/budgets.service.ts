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
  ) {}

  async create(createDto: CreateBudgetDto, tenantId: string) {
    const { patientId, items, doctorId } = createDto;

    // 1. Verificar que el paciente pertenece al tenant
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new UnauthorizedException('Patient access denied');

    // 2. Obtener los IDs de los tratamientos y verificar que todos existan y pertenezcan al tenant
    const treatmentIds = items.map(item => item.treatmentId);
    const treatments = await this.treatmentRepository.find({
      where: { id: In(treatmentIds), tenant: { id: tenantId } },
    });
    if (treatments.length !== treatmentIds.length) {
      throw new NotFoundException('One or more treatments not found');
    }

    // 3. Crear los items del presupuesto y calcular el total
    let totalAmount = 0;
    const budgetItems = items.map(itemDto => {
      const treatment = treatments.find(t => t.id === itemDto.treatmentId);
      const item = new BudgetItem();
      item.treatment = treatment;
      item.quantity = itemDto.quantity;
      item.priceAtTimeOfBudget = treatment.price;
      totalAmount += item.priceAtTimeOfBudget * item.quantity;
      return item;
    });

    // 4. Crear el presupuesto principal
    const newBudget = this.budgetRepository.create({
      patient,
      tenant: { id: tenantId },
      doctor: doctorId ? { id: doctorId } : undefined,
      totalAmount,
      items: budgetItems, // TypeORM guardará los items gracias a `cascade: true`
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

