import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  create(
    createExpenseDto: CreateExpenseDto,
    tenantId: string,
    branchId: string | null,
  ) {
    // Un gasto pertenece a una sede concreta; en vista consolidada no se
    // puede saber a cual, asi que se pide elegir.
    if (!branchId) {
      throw new BadRequestException(
        'Selecciona una sede para registrar el gasto.',
      );
    }
    const newExpense = this.expenseRepository.create({
      ...createExpenseDto,
      tenant: { id: tenantId },
      branch: { id: branchId } as Branch,
      // TypeORM maneja la conversión de string a Date aquí
    });
    return this.expenseRepository.save(newExpense);
  }

  findAll(tenantId: string, branchId: string | null) {
    return this.expenseRepository.find({
      where: {
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      // La propiedad para ordenar es 'date'
      order: { date: 'DESC' },
    });
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
    tenantId: string,
    branchId: string | null,
  ) {
    const expense = await this.expenseRepository.findOneBy({
      id,
      tenant: { id: tenantId },
      ...(branchId ? { branch: { id: branchId } } : {}),
    });
    if (!expense) throw new NotFoundException('Gasto no encontrado');

    const updatedExpense = this.expenseRepository.merge(expense, updateExpenseDto);
    return this.expenseRepository.save(updatedExpense);
  }

  async remove(id: string, tenantId: string, branchId: string | null) {
    const result = await this.expenseRepository.delete({
      id,
      tenant: { id: tenantId },
      ...(branchId ? { branch: { id: branchId } } : {}),
    });
    if (result.affected === 0) throw new NotFoundException('Gasto no encontrado');
  }
}