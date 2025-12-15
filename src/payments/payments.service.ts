import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Budget, BudgetStatus } from '../budgets/entities/budget.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(dto: CreatePaymentDto, budgetId: string, userId: string, tenantId: string) {
    // Usamos transacción para asegurar consistencia
    return this.dataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(Budget);
      const paymentRepo = manager.getRepository(Payment);

      const budget = await budgetRepo.findOneBy({ id: budgetId, tenant: { id: tenantId } });
      if (!budget) throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);

      // --- CORRECCIÓN LÓGICA DE SALDO Y ESTADO ---
      
      // 1. Calculamos el monto REAL a pagar (Total - Descuento)
      const totalToPay = Number(budget.totalAmount) - (Number(budget.discountAmount) || 0);
      
      // 2. Calculamos el saldo pendiente real
      const remainingBalance = totalToPay - Number(budget.paidAmount);
      
      // Validación: Evitar que paguen más de lo que deben (con pequeña tolerancia por decimales)
      if (Number(dto.amount) > remainingBalance + 0.01) {
        throw new BadRequestException(`El pago excede el saldo pendiente real de S/. ${remainingBalance.toFixed(2)}`);
      }

      // 3. Crear el pago
      const newPayment = paymentRepo.create({
        ...dto,
        budget: { id: budgetId },
        registeredBy: { id: userId },
        tenant: { id: tenantId },
      });
      await paymentRepo.save(newPayment);

      // 4. Actualizar acumulado
      budget.paidAmount = Number(budget.paidAmount) + Number(dto.amount);

      // 5. Determinar estado comparando con el TOTAL CON DESCUENTO
      if (budget.paidAmount >= (totalToPay - 0.01)) {
        budget.status = BudgetStatus.COMPLETED;
      } else {
        budget.status = BudgetStatus.IN_PROGRESS;
      }
      
      await budgetRepo.save(budget);

      return newPayment;
    });
  }

  async findOne(id: string, tenantId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: [
        'budget',
        'budget.patient',
        'budget.tenant',
        'budget.items',
        'budget.items.treatment',
      ],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found.`);
    }
    
    return payment;
  }

  async findAllForBudget(budgetId: string, tenantId: string) {
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });
    if (!budget) throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);

    return this.paymentRepository.find({
      where: { budget: { id: budgetId } },
      order: { paymentDate: 'DESC' },
    });
  }
}