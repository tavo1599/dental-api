import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { CashManagementController } from './cash-management.controller';
import { CashManagementService } from './cash-management.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Expense])],
  controllers: [CashManagementController],
  providers: [CashManagementService],
})
export class CashManagementModule {}