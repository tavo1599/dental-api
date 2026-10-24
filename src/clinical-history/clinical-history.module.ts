import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalHistoryController } from './clinical-history.controller';
import { ClinicalHistoryService } from './clinical-history.service';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { PatientsModule } from '../patients/patients.module'; // <-- 1. Importa el módulo de Pacientes
import { AppointmentsModule } from '../appointments/appointments.module';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    // Branch lo necesita BranchContextGuard, que ahora protege las rutas que
    // pueden agendar: una cita siempre ocurre en una sede concreta.
    TypeOrmModule.forFeature([ClinicalHistoryEntry, Appointment, Branch, User]),
    forwardRef(() => PatientsModule), // <-- 2. Añade el módulo aquí
    AppointmentsModule,
  ],
  controllers: [ClinicalHistoryController],
  providers: [ClinicalHistoryService],
  exports: [ClinicalHistoryService],
})
export class ClinicalHistoryModule {}