import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalHistoryController } from './clinical-history.controller';
import { ClinicalHistoryService } from './clinical-history.service';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { PatientsModule } from '../patients/patients.module'; // <-- 1. Importa el módulo de Pacientes

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalHistoryEntry]),
    forwardRef(() => PatientsModule), // <-- 2. Añade el módulo aquí
  ],
  controllers: [ClinicalHistoryController],
  providers: [ClinicalHistoryService],
  exports: [ClinicalHistoryService],
})
export class ClinicalHistoryModule {}