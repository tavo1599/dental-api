import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ClinicalHistoryEntry } from './entities/clinical-history-entry.entity';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
import { PatientsService } from '../patients/patients.service'; 
import { AppointmentsService } from '../appointments/appointments.service';
import {
  Appointment,
  AppointmentStatus,
} from '../appointments/entities/appointment.entity';

@Injectable()
export class ClinicalHistoryService {
  constructor(
    @InjectRepository(ClinicalHistoryEntry)
    private readonly historyRepository: Repository<ClinicalHistoryEntry>,
    @Inject(forwardRef(() => PatientsService))
    private readonly patientsService: PatientsService,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    // Para agendar la proxima cita reutilizando su control de cruces, en
    // lugar de duplicar esa validacion aqui.
    private readonly appointmentsService: AppointmentsService,
  ) {}

  /**
   * Planes de proxima cita que todavia hay que GESTIONAR.
   *
   * Se excluyen los que ya tienen cita en la agenda: de esos se encarga la
   * agenda, y volver a avisar seria ruido. Lo que queda es la lista de
   * pacientes a los que hay que llamar para acordar la hora.
   *
   * El filtro compara por DIA y no por igualdad con el texto de la fecha.
   * Funcionaba de casualidad: la columna es un timestamp y coincidia porque lo
   * guardado era exactamente medianoche. En cuanto una fecha llevara hora, el
   * aviso dejaba de encontrarla sin que nadie se enterara.
   */
  async findAllReminders(tenantId: string, date?: string) {
    const qb = this.historyRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.patient', 'patient')
      .leftJoinAndSelect('entry.user', 'user')
      .leftJoin('entry.plannedAppointment', 'cita')
      .where('entry."tenantId" = :tenantId', { tenantId })
      .andWhere('entry."nextAppointmentDate" IS NOT NULL')
      // Sin cita, o con una que se cancelo: en los dos casos sigue pendiente.
      .andWhere('(cita.id IS NULL OR cita.status IN (:...descartadas))', {
        descartadas: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      })
      .orderBy('entry.nextAppointmentDate', 'ASC')
      .take(50);

    if (date) {
      qb.andWhere('CAST(entry."nextAppointmentDate" AS date) = :dia', {
        dia: date,
      });
    }

    return qb.getMany();
  }

  // --- MÉTODOS ORIGINALES ---

  async create(
    createDto: CreateClinicalHistoryEntryDto,
    patientId: string,
    userId: string,
    tenantId: string,
    branchId: string | null,
  ) {
    await this.patientsService.findOne(patientId, tenantId);

    const sanitizedDate = 
      (!createDto.nextAppointmentDate || createDto.nextAppointmentDate === '') 
        ? null 
        : createDto.nextAppointmentDate;
    
    const sanitizedPlan = 
      (!createDto.nextAppointmentPlan || createDto.nextAppointmentPlan === '')
        ? null
        : createDto.nextAppointmentPlan;

    // Un objeto vacio se guarda como null: si el rubro no anota nada en esta
    // sesion, mejor no dejar un {} suelto en la base.
    const detalles = createDto.sessionDetails;
    const sanitizedDetails =
      detalles && Object.keys(detalles).length > 0 ? detalles : null;

    /*
     * Si la clinica agenda en el momento, la cita se crea PRIMERO.
     *
     * Asi, si la hora choca con otra, el error salta antes de guardar nada y
     * quien atiende puede elegir otra hora sin que quede una entrada de
     * historia a medias.
     */
    const cita = await this.crearCitaPlanificada(
      createDto,
      sanitizedDate ?? null,
      patientId,
      userId,
      tenantId,
      branchId,
    );

    const newEntry = this.historyRepository.create({
      ...createDto,
      nextAppointmentDate: sanitizedDate,
      nextAppointmentPlan: sanitizedPlan,
      sessionDetails: sanitizedDetails,
      plannedAppointment: cita ? ({ id: cita.id } as Appointment) : null,
      patient: { id: patientId },
      user: { id: userId },
      tenant: { id: tenantId },
    });

    try {
      return await this.historyRepository.save(newEntry);
    } catch (error) {
      // Si la entrada no se pudo guardar, no debe quedar en la agenda una cita
      // que nadie pidio.
      if (cita) {
        await this.appointmentRepository
          .delete({ id: cita.id })
          .catch(() => undefined);
      }
      throw error;
    }
  }

  /**
   * Crea la cita de la agenda cuando la clinica decide agendar en el momento.
   *
   * Devuelve null si solo se queria el recordatorio, que es el comportamiento
   * de siempre: la fecha queda anotada y alguien llamara al paciente.
   *
   * La HORA se exige a proposito. La agenda reserva un espacio y comprueba
   * cruces, asi que necesita una hora de verdad; poner una por defecto
   * acabaria citando pacientes unos encima de otros a una hora que nadie
   * acordo.
   */
  private async crearCitaPlanificada(
    dto: CreateClinicalHistoryEntryDto,
    fechaPlan: string | null,
    patientId: string,
    userId: string,
    tenantId: string,
    branchId: string | null,
  ): Promise<Appointment | null> {
    if (!dto.scheduleNextAppointment) return null;

    if (!fechaPlan) {
      throw new BadRequestException(
        'Para agendar la próxima cita hace falta la fecha.',
      );
    }
    if (!dto.nextAppointmentTime) {
      throw new BadRequestException(
        'Para agendar la próxima cita hace falta la hora.',
      );
    }

    // Solo el dia del plan: la hora viaja aparte, de modo que la fecha que se
    // guarda en la historia sigue siendo un dia a secas y el aviso por dia
    // sigue encontrandola.
    const dia = String(fechaPlan).slice(0, 10);
    const duracion = dto.nextAppointmentDurationMinutes ?? 30;

    const [horas, minutos] = dto.nextAppointmentTime.split(':').map(Number);
    // Se calcula en UTC a proposito: aqui solo se suman minutos a un reloj, y
    // asi el horario de verano o la zona del servidor no entran en juego.
    const fin = new Date(Date.UTC(2000, 0, 1, horas, minutos));
    fin.setUTCMinutes(fin.getUTCMinutes() + duracion);
    if (fin.getUTCDate() !== 1) {
      throw new BadRequestException(
        'La próxima cita no puede terminar al día siguiente. Acorta la duración.',
      );
    }
    const horaFin =
      String(fin.getUTCHours()).padStart(2, '0') +
      ':' +
      String(fin.getUTCMinutes()).padStart(2, '0');

    // Sin zona en el texto: el servicio de citas lo entiende como hora de la
    // clinica, igual que cuando se agenda desde el calendario.
    const cita = await this.appointmentsService.create(
      {
        startTime: `${dia}T${dto.nextAppointmentTime}:00` as any,
        endTime: `${dia}T${horaFin}:00` as any,
        patientId,
        // Si no se indica otro, atiende quien firma la atencion de hoy.
        doctorId: dto.nextAppointmentDoctorId ?? userId,
        notes: dto.nextAppointmentPlan || undefined,
      },
      tenantId,
      branchId,
    );

    return cita as Appointment;
  }

  async findAllForPatient(patientId: string, tenantId: string) {
    await this.patientsService.findOne(patientId, tenantId);

    return this.historyRepository.find({
      where: { patient: { id: patientId } },
      order: { entryDate: 'DESC' },
      // La cita ligada, para mostrar en que quedo el plan: agendada,
      // reprogramada o cancelada.
      relations: ['user', 'plannedAppointment'],
    });
  }

  async update(id: string, updateDto: any, tenantId: string) {
    // Agregamos filtro por tenant para seguridad
    const entry = await this.historyRepository.findOne({ where: { id, tenant: { id: tenantId } } });
    if (!entry) throw new NotFoundException(`Entrada de historial ${id} no encontrada`);

    if ('nextAppointmentDate' in updateDto) {
      if (!updateDto.nextAppointmentDate || updateDto.nextAppointmentDate === '') {
        updateDto.nextAppointmentDate = null;
      }
    }
    
    if ('nextAppointmentPlan' in updateDto) {
      if (!updateDto.nextAppointmentPlan || updateDto.nextAppointmentPlan === '') {
        updateDto.nextAppointmentPlan = null;
      }
    }

    const updatedEntry = this.historyRepository.merge(entry, updateDto);
    return this.historyRepository.save(updatedEntry);
  }

  async remove(id: string, tenantId: string) {
    // Agregamos filtro por tenant para seguridad
    const entry = await this.historyRepository.findOne({ where: { id, tenant: { id: tenantId } } });
    if (!entry) throw new NotFoundException(`Entrada de historial ${id} no encontrada`);
    return this.historyRepository.remove(entry);
  }
}