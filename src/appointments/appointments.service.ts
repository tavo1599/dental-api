import { Injectable, NotFoundException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, LessThan, MoreThan, Not } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentTimeDto } from './dto/update-appointment-time.dto';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(createDto: CreateAppointmentDto, tenantId: string) {
    const { patientId, doctorId, notes } = createDto;
    
    // Convertir fechas (asegúrate de que el formato sea compatible con tu frontend, aquí se asume ISO)
    // El frontend suele enviar 'YYYY-MM-DDTHH:mm:ss' o similar.
    // Si tu frontend envía solo "2023-10-25 10:00", el -05:00 es correcto para Lima.
    // Si envía ISO completo (con Z o offset), new Date() lo maneja.
    // Asumiremos que el input es compatible con tu lógica actual.
    const startTime = new Date(`${createDto.startTime}-05:00`);
    const endTime = new Date(`${createDto.endTime}-05:00`);

    // --- VALIDACIÓN DE CRUCE DE HORARIOS (NUEVO) ---
    const overlappingAppointment = await this.appointmentRepository.findOne({
      where: {
        doctor: { id: doctorId }, // Mismo doctor
        tenant: { id: tenantId }, // Misma clínica (por seguridad)
        status: Not(AppointmentStatus.CANCELLED), // Ignorar canceladas
        // La lógica de solapamiento es:
        // (NuevaInicio < CitaFin) Y (NuevaFin > CitaInicio)
        startTime: LessThan(endTime),
        endTime: MoreThan(startTime),
      }
    });

    if (overlappingAppointment) {
      throw new BadRequestException('El doctor ya tiene una cita agendada en ese horario.');
    }
    // ----------------------------------------------

    const patient = await this.patientRepository.findOneBy({ id: patientId, tenant: { id: tenantId } });
    if (!patient) throw new UnauthorizedException('El paciente no pertenece a esta clínica.');
    
    const doctor = await this.userRepository.findOneBy({ id: doctorId, tenant: { id: tenantId } });
    if (!doctor) throw new UnauthorizedException('El doctor seleccionado no es válido para esta clínica.');

    const newAppointment = this.appointmentRepository.create({
      startTime,
      endTime,
      notes,
      patient: { id: patientId },
      doctor: { id: doctorId },
      tenant: { id: tenantId },
    });

    const savedAppointment = await this.appointmentRepository.save(newAppointment);
    
    const fullAppointment = await this.appointmentRepository.findOne({
      where: { id: savedAppointment.id },
      relations: ['patient', 'doctor', 'doctor.tenant'],
    });

    if (fullAppointment) {
      this.googleCalendarService.createEvent(tenantId, fullAppointment).catch(err => {
        this.logger.error('Falló la creación del evento en Google Calendar', err);
      });
    }

    return fullAppointment;
  }

  async findAll(tenantId: string) {
    return this.appointmentRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['patient', 'doctor', 'doctor.tenant'],
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
    if (!appointment) throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    appointment.status = updateDto.status;
    return this.appointmentRepository.save(appointment);
  }
  
  async updateTime(
    appointmentId: string,
    dto: UpdateAppointmentTimeDto,
    tenantId: string,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenant: { id: tenantId } },
      relations: ['doctor'] // Necesitamos el doctor para validar cruces
    });
    if (!appointment) throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);

    const newStartTime = new Date(`${dto.startTime}-05:00`);
    let newEndTime: Date;
    if (dto.endTime) {
      newEndTime = new Date(`${dto.endTime}-05:00`);
    } else {
      const originalStartTime = new Date(appointment.startTime);
      const originalEndTime = new Date(appointment.endTime);
      const duration = originalEndTime.getTime() - originalStartTime.getTime();
      newEndTime = new Date(newStartTime.getTime() + duration);
    }

    // --- VALIDACIÓN DE CRUCE DE HORARIOS (UPDATE) ---
    // Verificamos si al mover la cita, choca con otra del mismo doctor
    const overlappingAppointment = await this.appointmentRepository.findOne({
      where: {
        id: Not(appointmentId), // Importante: Excluirse a sí misma
        doctor: { id: appointment.doctor.id },
        tenant: { id: tenantId },
        status: Not(AppointmentStatus.CANCELLED),
        startTime: LessThan(newEndTime),
        endTime: MoreThan(newStartTime),
      }
    });

    if (overlappingAppointment) {
      throw new BadRequestException('El doctor ya tiene una cita agendada en ese nuevo horario.');
    }
    // ------------------------------------------------

    appointment.startTime = newStartTime;
    appointment.endTime = newEndTime;
    return this.appointmentRepository.save(appointment);
  }

  async remove(id: string, tenantId: string) {
    const appointment = await this.appointmentRepository.findOneBy({ 
      id, 
      tenant: { id: tenantId } 
    });
    
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada.');
    }

    // Si la cita tiene un evento de Google asociado, lo borramos
    if (appointment.googleEventId) {
      try {
        await this.googleCalendarService.deleteEvent(tenantId, appointment.googleEventId);
      } catch (error) {
        this.logger.warn('No se pudo eliminar el evento de Google Calendar.');
      }
    }

    await this.appointmentRepository.remove(appointment);
    return { message: 'Cita eliminada permanentemente.' };
  }
}