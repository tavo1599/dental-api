import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PatientsModule } from '../patients/patients.module'; // <-- 1. Importa el Módulo de Pacientes

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget, 
      BudgetItem, 
      Treatment, 
      User,   
      Tenant
    ]),
    PatientsModule // <-- 2. Añádelo aquí
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}