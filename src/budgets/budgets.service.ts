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

  // --- MÉTODO 'create' CORREGIDO Y SOPORTANDO DESCUENTO ---
  async create(createBudgetDto: CreateBudgetDto, tenantId: string, doctorId: string) {
    const { patientId, items: itemsDto, discountAmount = 0 } = createBudgetDto as any;

    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    let totalAmount = 0;
    const budgetItems: BudgetItem[] = [];

    for (const itemDto of itemsDto) {
      const treatment = await this.treatmentRepository.findOneBy({ id: itemDto.treatmentId, tenant: { id: tenantId } });
      if (treatment) {
        const itemTotal = Number(treatment.price) * Number(itemDto.quantity);
        totalAmount += itemTotal;

        const newBudgetItem = this.budgetItemRepository.create({
          treatment,
          quantity: itemDto.quantity,
          priceAtTimeOfBudget: treatment.price,
        });
        budgetItems.push(newBudgetItem);
      }
    }

    const discount = Number(discountAmount) || 0;
    const finalAmount = Math.max(0, Number(totalAmount) - discount);

    const newBudget = this.budgetRepository.create({
      patient,
      tenant: { id: tenantId },
      doctor: { id: doctorId }, // Ahora sí existe doctorId
      totalAmount,
      discountAmount: discount,
      finalAmount,
      items: budgetItems,
    });

    const saved = await this.budgetRepository.save(newBudget);

    // Previously emitted a websocket event here; websockets were removed.

    return saved;
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

  // Permite actualizar el descuento de un presupuesto y recalcular el monto final
  async updateDiscount(budgetId: string, tenantId: string, discountAmount: number) {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    budget.discountAmount = Number(discountAmount) || 0;

    // Asegurarnos de tener el subtotal; si no, cargar items y calcularlo
    if (!budget.totalAmount || Number(budget.totalAmount) === 0) {
      const loaded = await this.budgetRepository.findOne({
        where: { id: budgetId, tenant: { id: tenantId } },
        relations: ['items'],
      });
      if (loaded) {
        let subtotal = 0;
        for (const it of loaded.items) {
          subtotal += Number(it.priceAtTimeOfBudget) * Number(it.quantity);
        }
        budget.totalAmount = subtotal;
      }
    }

    budget.finalAmount = Math.max(0, Number(budget.totalAmount) - Number(budget.discountAmount));

    return this.budgetRepository.save(budget);
  }

  // Elimina un presupuesto por id (asegurando tenant)
  async remove(budgetId: string, tenantId: string) {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId, tenant: { id: tenantId } },
      relations: ['items'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    // Al usar remove se respetan los cascades y se eliminan items relacionados
    await this.budgetRepository.remove(budget);
    return;
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