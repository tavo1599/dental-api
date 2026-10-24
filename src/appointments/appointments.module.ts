import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
// --- ESTA ES LA LÍNEA CORREGIDA ---

@Module({
  imports: [
    // Branch lo necesita BranchContextGuard para validar el acceso a la sede.
    TypeOrmModule.forFeature([Appointment, Patient, User, Branch]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  // La historia clinica lo usa para agendar la proxima cita en el momento,
  // reutilizando su control de cruces en lugar de duplicarlo.
  exports: [AppointmentsService],
})
export class AppointmentsModule {}