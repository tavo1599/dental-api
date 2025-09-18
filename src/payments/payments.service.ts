import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Budget, BudgetStatus } from '../budgets/entities/budget.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource, // Inyectamos el DataSource para transacciones
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(dto: CreatePaymentDto, budgetId: string, userId: string, tenantId: string) {
    // Usamos una transacción para asegurar la integridad de los datos
    return this.dataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(Budget);
      const paymentRepo = manager.getRepository(Payment);

      // 1. Encontrar el presupuesto y asegurarse de que pertenece al tenant
      const budget = await budgetRepo.findOneBy({ id: budgetId, tenant: { id: tenantId } });
      if (!budget) throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);

      // 2. Verificar que el pago no exceda el saldo pendiente
      const remainingBalance = budget.totalAmount - budget.paidAmount;
      if (dto.amount > remainingBalance) {
        throw new BadRequestException(`Payment amount exceeds remaining balance of ${remainingBalance}`);
      }

      // 3. Crear y guardar el nuevo pago
      const newPayment = paymentRepo.create({
        ...dto,
        budget: { id: budgetId },
        registeredBy: { id: userId },
        tenant: { id: tenantId },
      });
      await paymentRepo.save(newPayment);

      // 4. Actualizar el monto pagado y el estado del presupuesto
      budget.paidAmount = Number(budget.paidAmount) + Number(dto.amount);
      if (budget.paidAmount >= budget.totalAmount) {
        budget.status = BudgetStatus.COMPLETED;
      } else {
        budget.status = BudgetStatus.IN_PROGRESS;
      }
      await budgetRepo.save(budget);

      return newPayment;
    });
  }

  async findAllForBudget(budgetId: string, tenantId: string) {
    // Verificar que el presupuesto exista y pertenezca al tenant antes de mostrar los pagos
    const budget = await this.budgetRepository.findOneBy({ id: budgetId, tenant: { id: tenantId } });
    if (!budget) throw new NotFoundException(`Budget with ID "${budgetId}" not found.`);

    return this.paymentRepository.find({
      where: { budget: { id: budgetId } },
      order: { paymentDate: 'DESC' },
    });
  }
}