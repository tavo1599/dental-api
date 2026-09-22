import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Branch } from '../branches/entities/branch.entity';
import { CashManagementController } from './cash-management.controller';
import { CashManagementService } from './cash-management.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Expense, Branch])],
  controllers: [CashManagementController],
  providers: [CashManagementService],
})
export class CashManagementModule {}