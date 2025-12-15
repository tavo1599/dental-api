import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(createBudgetDto: CreateBudgetDto, tenantId: string, doctorId: string) {
    // 1. Extraer todos los campos, incluyendo los nuevos de ortodoncia
    const { 
      patientId, 
      items: itemsDto, 
      discountAmount = 0,
      isOrthodontic = false,
      orthoType,
      baseTreatmentCost = 0,
      initialPayment = 0,
      installments = 0,
      monthlyPayment = 0
    } = createBudgetDto as any;

    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // 2. Calcular el total de los ITEMS (Tratamientos/Aparatología)
    let itemsTotal = 0;
    const budgetItems: BudgetItem[] = [];

    for (const itemDto of itemsDto) {
      const treatment = await this.treatmentRepository.findOneBy({ id: itemDto.treatmentId, tenant: { id: tenantId } });
      if (treatment) {
        // Usamos el precio enviado desde el frontend si existe (para congelar el precio), o el actual
        const price = itemDto.priceAtTimeOfBudget !== undefined ? Number(itemDto.priceAtTimeOfBudget) : Number(treatment.price);
        const quantity = Number(itemDto.quantity);
        
        itemsTotal += price * quantity;

        const newBudgetItem = this.budgetItemRepository.create({
          treatment,
          quantity: quantity,
          priceAtTimeOfBudget: price,
        });
        budgetItems.push(newBudgetItem);
      }
    }

    // 3. Calcular el TOTAL GENERAL
    let totalAmount = itemsTotal;

    // Si es ortodoncia, sumamos el Costo Base (Honorarios) a los items
    if (isOrthodontic) {
      totalAmount += Number(baseTreatmentCost);
    }

    // 4. Calcular Monto Final con Descuento
    const discount = Number(discountAmount) || 0;
    const finalAmount = Math.max(0, totalAmount - discount);

    // 5. Crear la entidad con TODOS los datos
    const newBudget = this.budgetRepository.create({
      patient,
      tenant: { id: tenantId },
      doctor: { id: doctorId },
      totalAmount,
      discountAmount: discount,
      finalAmount,
      items: budgetItems,
      // Campos de Ortodoncia
      isOrthodontic,
      orthoType,
      baseTreatmentCost: Number(baseTreatmentCost),
      initialPayment: Number(initialPayment),
      installments: Number(installments),
      monthlyPayment: Number(monthlyPayment),
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

  // Permite actualizar el descuento y recalcular el monto final
  async updateDiscount(budgetId: string, tenantId: string, discountAmount: number) {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

    budget.discountAmount = Number(discountAmount) || 0;

    // Recalcular total si es necesario (seguridad)
    // Si por alguna razón totalAmount estuviera en 0 o corrupto, lo reconstruimos
    if (!budget.totalAmount || Number(budget.totalAmount) === 0) {
      const loaded = await this.budgetRepository.findOne({
        where: { id: budgetId, tenant: { id: tenantId } },
        relations: ['items'],
      });
      
      if (loaded) {
        let subtotalItems = 0;
        for (const it of loaded.items) {
          subtotalItems += Number(it.priceAtTimeOfBudget) * Number(it.quantity);
        }
        
        // CORRECCIÓN: Si es ortodoncia, sumar el costo base al recalcular
        if (loaded.isOrthodontic) {
           budget.totalAmount = subtotalItems + Number(loaded.baseTreatmentCost || 0);
        } else {
           budget.totalAmount = subtotalItems;
        }
      }
    }

    budget.finalAmount = Math.max(0, Number(budget.totalAmount) - Number(budget.discountAmount));

    return this.budgetRepository.save(budget);
  }

  async remove(budgetId: string, tenantId: string) {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId, tenant: { id: tenantId } },
      relations: ['items'],
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);
    }

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