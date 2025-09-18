import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';

@Injectable()
export class CashManagementService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  // Ahora la función recibe el string 'YYYY-MM-DD' directamente
  async getDailySummary(dateString: string, tenantId: string) {
    // Creamos las fechas de inicio y fin del día en la zona horaria de Perú (UTC-5)
    // Esto asegura que la búsqueda en la base de datos sea exacta.
    const startOfDay = new Date(`${dateString}T00:00:00.000-05:00`);
    const endOfDay = new Date(`${dateString}T23:59:59.999-05:00`);

    const payments = await this.paymentRepository.find({
      where: {
        tenant: { id: tenantId },
        paymentDate: Between(startOfDay, endOfDay),
      },
      relations: ['budget', 'budget.patient'],
    });

    const expenses = await this.expenseRepository.find({
      where: {
        tenant: { id: tenantId },
        date: Between(startOfDay, endOfDay),
      },
    });

    const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpenses;

    return { payments, expenses, totalIncome, totalExpenses, balance };
  }
}