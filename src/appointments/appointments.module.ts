import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
// --- ESTA ES LA LÍNEA CORREGIDA ---
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Patient, User]),
    GoogleCalendarModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}