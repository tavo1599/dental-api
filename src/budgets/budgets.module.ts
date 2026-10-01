import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { Treatment } from '../treatments/entities/treatment.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PatientsModule } from '../patients/patients.module'; // <-- 1. Importa el Módulo de Pacientes
import { TreatmentSessionLog } from './entities/treatment-session-log.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Budget, 
      BudgetItem, 
      Treatment, 
      User,   
      Tenant,
      Branch,
      TreatmentSessionLog,
    ]),
    PatientsModule // <-- 2. Añádelo aquí
  ],
  controllers: [BudgetsController, SessionsController],
  providers: [BudgetsService, SessionsService],
})
export class BudgetsModule {}