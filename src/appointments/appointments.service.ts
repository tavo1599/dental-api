import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentTimeDto } from './dto/update-appointment-time.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateAppointmentDto, tenantId: string) {
    const { patientId, doctorId, startTime, endTime, notes } = createDto;

    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new UnauthorizedException('El paciente no pertenece a esta clínica.');
    
    const doctor = await this.userRepository.findOneBy({ id: doctorId, tenant: { id: tenantId } });
    if (!doctor) throw new UnauthorizedException('El doctor seleccionado no es válido para esta clínica.');

    // Al crear, pasamos solo los IDs de las relaciones para evitar errores
    const newAppointment = this.appointmentRepository.create({
      startTime,
      endTime,
      notes,
      patient: { id: patientId },
      doctor: { id: doctorId },
      tenant: { id: tenantId },
    });

    return this.appointmentRepository.save(newAppointment);
  }

  async findAll(tenantId: string) {
    return this.appointmentRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['patient', 'doctor', 'doctor.tenant'], // La clave es 'doctor.tenant'
      order: { startTime: 'ASC' },
    });
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new NotFoundException(`Patient with ID "${patientId}" not found in this tenant.`);

    return this.appointmentRepository.find({
      where: {
        patient: { id: patientId },
        tenant: { id: tenantId },
      },
      relations: ['patient', 'doctor'],
      order: { startTime: 'DESC' },
    });
  }

  async findNextDayPending(tenantId: string) {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    return this.appointmentRepository.find({
      where: {
        tenant: { id: tenantId },
        status: AppointmentStatus.SCHEDULED,
        startTime: Between(tomorrowStart, tomorrowEnd),
      },
      relations: ['patient'],
      order: { startTime: 'ASC' },
    });
  }

  async updateStatus(
    appointmentId: string,
    updateDto: UpdateAppointmentStatusDto,
    tenantId: string,
  ) {
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
      tenant: { id: tenantId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    appointment.status = updateDto.status;
    return this.appointmentRepository.save(appointment);
  }
  
  async updateTime(
    appointmentId: string,
    dto: UpdateAppointmentTimeDto,
    tenantId: string,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenant: { id: tenantId } }
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    }

    const originalStartTime = new Date(appointment.startTime);
    const originalEndTime = new Date(appointment.endTime);
    const duration = originalEndTime.getTime() - originalStartTime.getTime();

    const newStartTime = new Date(dto.startTime);
    const newEndTime = dto.endTime 
      ? new Date(dto.endTime) 
      : new Date(newStartTime.getTime() + duration);
      
    appointment.startTime = newStartTime;
    appointment.endTime = newEndTime;

    return this.appointmentRepository.save(appointment);
  }
}