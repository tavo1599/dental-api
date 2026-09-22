import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Budget } from '../budgets/entities/budget.entity'; // <-- 1. Importa la entidad que falta
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Branch } from '../branches/entities/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment, 
      Patient, 
      Payment, 
      Budget, // <-- 2. Añádela a la lista
      Branch, // la necesita BranchContextGuard
    ])
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}