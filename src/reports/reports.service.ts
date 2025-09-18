import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async getFinancialSummary(startDate: Date, endDate: Date, tenantId: string) {
    // 1. Busca todos los pagos en el rango de fechas para la clínica
    const payments = await this.paymentRepository.find({
      where: {
        tenant: { id: tenantId },
        paymentDate: Between(startDate, endDate),
      },
    });

    // 2. Busca todos los gastos en el rango de fechas para la clínica
    const expenses = await this.expenseRepository.find({
      where: {
        tenant: { id: tenantId },
        date: Between(startDate, endDate),
      },
    });

    // 3. Calcula los totales
    const totalIncome = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const balance = totalIncome - totalExpenses;

    // 4. Devuelve el resumen
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalIncome,
      totalExpenses,
      balance,
      totalPayments: payments.length,
      totalExpensesCount: expenses.length,
    };
  }
}