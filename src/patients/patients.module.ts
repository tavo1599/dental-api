import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './entities/patient.entity';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { AuditModule } from '../audit/audit.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [
    // La clave es que todas las entidades que usa el servicio estén listadas aquí
    TypeOrmModule.forFeature([Patient, ClinicalHistoryEntry, MedicalHistory]), 
    AuditModule, 
    forwardRef(() => BudgetsModule),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}