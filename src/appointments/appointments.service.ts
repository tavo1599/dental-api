import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, LessThan, MoreThan, Not, In } from 'typeorm'; // <-- NUEVO: Agregado 'In'
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Branch } from '../branches/entities/branch.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentTimeDto } from './dto/update-appointment-time.dto';
import { parseClinicDateTime } from '../common/clinic-time';

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

  /**
   * Lo que ya tiene ocupado un doctor ese dia.
   *
   * Sirve para avisar ANTES de guardar: la pantalla puede decir "esa hora esta
   * ocupada" y proponer la siguiente libre, en lugar de dejar escribir todo y
   * soltar el error al final.
   *
   * No sustituye al control de cruces de create(): ahi sigue estando la
   * palabra final, porque entre que se consulta y se guarda puede entrar otra
   * cita. Esto es para avisar a tiempo, no para autorizar.
   *
   * A proposito SIN filtrar por sede, igual que el control de cruces: un
   * doctor no puede estar en dos sucursales a la vez.
   */
  async findDoctorDayBusy(
    tenantId: string,
    doctorId: string,
    date: string,
  ): Promise<Array<{ start: string; end: string; patientName: string }>> {
    const desde = parseClinicDateTime(`${date}T00:00:00`, 'fecha');
    const hasta = parseClinicDateTime(`${date}T23:59:59`, 'fecha');

    const citas = await this.appointmentRepository.find({
      where: {
        doctor: { id: doctorId },
        tenant: { id: tenantId },
        status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])),
        startTime: Between(desde, hasta),
      },
      relations: ['patient'],
      order: { startTime: 'ASC' },
    });

    return citas.map((c) => ({
      start: c.startTime.toISOString(),
      end: c.endTime.toISOString(),
      patientName: (c as any).patient?.fullName ?? 'Paciente',
    }));
  }

  async create(
    createDto: CreateAppointmentDto,
    tenantId: string,
    branchId: string | null,
  ) {
    // Una cita SIEMPRE ocurre en una sede concreta. Si el admin esta viendo
    // "todas las sedes" no hay forma de saber cual, asi que se le pide elegir.
    if (!branchId) {
      throw new BadRequestException(
        'Selecciona una sede para poder agendar la cita.',
      );
    }
    const { patientId, doctorId, notes } = createDto;
    
    // Si el cliente no manda zona se entiende hora de Lima; si la manda, se
    // respeta. Concatenar a ciegas rompia con cualquier fecha ISO con Z.
    const startTime = parseClinicDateTime(createDto.startTime, 'hora de inicio');
    const endTime = parseClinicDateTime(createDto.endTime, 'hora de fin');

    // --- VALIDACIÓN DE CRUCE DE HORARIOS (CORREGIDO) ---
    const overlappingAppointment = await this.appointmentRepository.findOne({
      where: {
        // A proposito SIN filtrar por sede: un doctor no puede estar en dos
        // sucursales a la vez, asi que el cruce se busca en toda la clinica.
        doctor: { id: doctorId }, 
        tenant: { id: tenantId }, 
        // AHORA IGNORA TANTO CANCELADAS COMO NO PRESENTADOS
        status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])),
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

    /*
     * Y tiene que ser alguien que ATIENDE.
     *
     * Hasta ahora bastaba con pertenecer a la clinica, asi que una cita podia
     * quedar a nombre de un asistente o de un admin de sede. Eso no solo sale
     * raro en la agenda: el control de cruces de abajo se hace contra el
     * doctor de la cita, asi que una cita a nombre de quien no atiende NO
     * choca con las del doctor de verdad, y se acaban pisando.
     *
     * El conjunto es el mismo que ofrece el selector de doctores: dentistas y
     * el titular, que en muchas clinicas tambien atiende.
     */
    if (![UserRole.DENTIST, UserRole.ADMIN].includes(doctor.role)) {
      throw new BadRequestException(
        `${doctor.fullName} no atiende pacientes, así que no se le pueden asignar citas.`,
      );
    }

    const newAppointment = this.appointmentRepository.create({
      startTime,
      endTime,
      notes,
      patient: { id: patientId },
      doctor: { id: doctorId },
      tenant: { id: tenantId },
      branch: { id: branchId } as Branch,
    });

    const savedAppointment = await this.appointmentRepository.save(newAppointment);
    
    const fullAppointment = await this.appointmentRepository.findOne({
      where: { id: savedAppointment.id },
      relations: ['patient', 'doctor', 'doctor.tenant'],
    });

    return fullAppointment;
  }

async findAll(
  tenantId: string,
  branchId: string | null,
  filters?: {
    doctorId?: string;
    status?: AppointmentStatus[] | 'all';
    startDate?: string;
    endDate?: string;
  },
) {
  // La agenda SI se separa por sede. Con branchId en null (admin viendo
  // "todas"), no se filtra y sale la agenda consolidada.
  const where: any = { tenant: { id: tenantId } };
  if (branchId) {
    where.branch = { id: branchId };
  }

  if (filters?.doctorId) {
    where.doctor = { id: filters.doctorId };
  }

  if (filters?.status === 'all') {
    // Se pidió explícitamente TODOS los estados -> no aplicar ningún filtro
  } else if (filters?.status?.length) {
    where.status = In(filters.status);
  } else {
    // Comportamiento por defecto (vista de Agenda): oculta canceladas y no-show
    where.status = Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]));
  }

if (filters?.startDate && filters?.endDate) {
  // Extrae solo "YYYY-MM-DD" sin importar si el string ya trae hora o no,
  // y reconstruye con el offset de Perú explícito.
  const startDatePart = filters.startDate.split('T')[0];
  const endDatePart = filters.endDate.split('T')[0];

  const start = new Date(`${startDatePart}T00:00:00-05:00`);
  const end = new Date(`${endDatePart}T23:59:59.999-05:00`);

  where.startTime = Between(start, end);
}

  return this.appointmentRepository.find({
    where,
    relations: ['patient', 'doctor'],
    order: { startTime: 'ASC' },
  });
}
  
  /**
   * Historial de citas del paciente. NO se filtra por sede a proposito: si el
   * paciente se atendio en otra sucursal, el doctor necesita verlo igual, como
   * pasa con la historia clinica.
   */
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

  async findNextDayPending(tenantId: string, branchId: string | null) {
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    return this.appointmentRepository.find({
      where: {
        tenant: { id: tenantId },
        // Cada sede llama a sus propios pacientes.
        ...(branchId ? { branch: { id: branchId } } : {}),
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
    branchId: string | null,
  ) {
    const appointment = await this.appointmentRepository.findOneBy({
      id: appointmentId,
      tenant: { id: tenantId },
      ...(branchId ? { branch: { id: branchId } } : {}),
    });
    if (!appointment) throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);
    appointment.status = updateDto.status;
    return this.appointmentRepository.save(appointment);
  }
  
  async updateTime(
    appointmentId: string,
    dto: UpdateAppointmentTimeDto,
    tenantId: string,
    branchId: string | null,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: {
        id: appointmentId,
        tenant: { id: tenantId },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['doctor'] 
    });
    if (!appointment) throw new NotFoundException(`Appointment with ID "${appointmentId}" not found.`);

    // Mismo criterio que al crear: la zona solo se asume si no viene.
    const newStartTime = parseClinicDateTime(dto.startTime, 'nueva hora de inicio');
    let newEndTime: Date;
    if (dto.endTime) {
      newEndTime = parseClinicDateTime(dto.endTime, 'nueva hora de fin');
    } else {
      const originalStartTime = new Date(appointment.startTime);
      const originalEndTime = new Date(appointment.endTime);
      const duration = originalEndTime.getTime() - originalStartTime.getTime();
      newEndTime = new Date(newStartTime.getTime() + duration);
    }

    // --- VALIDACIÓN DE CRUCE DE HORARIOS (CORREGIDO) ---
    const overlappingAppointment = await this.appointmentRepository.findOne({
      where: {
        id: Not(appointmentId), 
        doctor: { id: appointment.doctor.id },
        tenant: { id: tenantId },
        // AHORA IGNORA TANTO CANCELADAS COMO NO PRESENTADOS
        status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])),
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

  async remove(id: string, tenantId: string, branchId: string | null) {
    const appointment = await this.appointmentRepository.findOneBy({ 
      id, 
      tenant: { id: tenantId },
      ...(branchId ? { branch: { id: branchId } } : {}),
    });
    
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada.');
    }

    await this.appointmentRepository.remove(appointment);
    return { message: 'Cita eliminada permanentemente.' };
  }
}