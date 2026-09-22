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

  /**
   * Reporte financiero. Con branchId sale el de UNA sede; con null (admin en
   * vista consolidada) sale el de todas las sucursales juntas, que es lo que
   * permite comparar y ver el total de la clinica.
   */
  async getFinancialReport(
    startDate: Date,
    endDate: Date,
    tenantId: string,
    branchId: string | null,
  ) {
    const payments = await this.paymentRepository.find({
      where: {
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
        paymentDate: Between(startDate, endDate),
      },
      relations: ['budget', 'budget.patient'], // Incluimos info del paciente
      order: { paymentDate: 'ASC' },
    });

    const expenses = await this.expenseRepository.find({
      where: {
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      payments,
      expenses,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
      },
    };
  }
}