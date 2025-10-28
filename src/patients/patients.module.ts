import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './entities/patient.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { OdontopediatricHistory } from './entities/odontopediatric-history.entity';
import { ClinicalHistoryModule } from '../clinical-history/clinical-history.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient, 
      MedicalHistory, 
      OdontopediatricHistory
    ]),
    forwardRef(() => ClinicalHistoryModule),
    AuditModule,
    // ¡Ya no importamos BudgetsModule!
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService, TypeOrmModule], // Exportamos el servicio y las entidades
})
export class PatientsModule {}