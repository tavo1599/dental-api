import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { Patient } from './entities/patient.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { ClinicalHistoryModule } from '../clinical-history/clinical-history.module'; // Importa el módulo
import { AuditModule } from '../audit/audit.module';
import { OdontopediatricHistory } from './entities/odontopediatric-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, MedicalHistory, OdontopediatricHistory]), // Solo registra sus propias entidades
    forwardRef(() => ClinicalHistoryModule), // Importa el módulo para usar su servicio
    AuditModule, 
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService, TypeOrmModule], // Exporta el servicio por si otros módulos lo necesitan
})
export class PatientsModule {}