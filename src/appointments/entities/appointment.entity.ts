import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  startTime: Date; // Fecha y hora de inicio

  @Column({ type: 'timestamp' })
  endTime: Date; // Fecha y hora de fin

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Column('text', { nullable: true })
  notes?: string; // Motivo de la cita o notas adicionales

  // Relación: La cita es para UN paciente
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  // Relación: La cita es con UN doctor (usuario)
  @ManyToOne(() => User)
  doctor: User;

  // Relación: La cita pertenece a UNA clínica
  @ManyToOne(() => Tenant)
  tenant: Tenant;
}