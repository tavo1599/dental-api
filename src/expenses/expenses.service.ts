import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  create(createExpenseDto: CreateExpenseDto, tenantId: string) {
    const newExpense = this.expenseRepository.create({
      ...createExpenseDto,
      tenant: { id: tenantId },
      // TypeORM maneja la conversión de string a Date aquí
    });
    return this.expenseRepository.save(newExpense);
  }

  findAll(tenantId: string) {
    return this.expenseRepository.find({
      where: { tenant: { id: tenantId } },
      // La propiedad para ordenar es 'date'
      order: { date: 'DESC' },
    });
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, tenantId: string) {
    const expense = await this.expenseRepository.findOneBy({ id, tenant: { id: tenantId } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');

    const updatedExpense = this.expenseRepository.merge(expense, updateExpenseDto);
    return this.expenseRepository.save(updatedExpense);
  }

  async remove(id: string, tenantId: string) {
    const result = await this.expenseRepository.delete({ id, tenant: { id: tenantId } });
    if (result.affected === 0) throw new NotFoundException('Gasto no encontrado');
  }
}