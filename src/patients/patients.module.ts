// src/patients/patients.module.ts
import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { AuditModule } from '../audit/audit.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [TypeOrmModule.forFeature([Patient]), AuditModule, BudgetsModule], // Acceso a la tabla Patient
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}