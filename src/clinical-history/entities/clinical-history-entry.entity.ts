import { Patient } from '../../patients/entities/patient.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'clinical_history_entries' })
export class ClinicalHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  entryDate: Date;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  evolution: string; // Evolución / SOAP

  @Column('text', { nullable: true })
  treatmentPerformed?: string;

  @Column('text', { nullable: true })
  diagnosis?: string;

  @Column('text', { nullable: true })
  prescription?: string;

  @Column('text', { nullable: true })
  indications?: string;

  @Column('text', { nullable: true, comment: 'Plan o acciones a realizar en la próxima cita' })
  nextAppointmentPlan?: string; 

  @Column({ type: 'timestamp', nullable: true, comment: 'Fecha sugerida para la próxima cita' })
  nextAppointmentDate?: Date;

  /**
   * La cita de la agenda que salio de este plan, si la clinica decidio
   * agendarla en el momento en vez de solo dejar el recordatorio.
   *
   * Nulo = es solo un recordatorio: alguien tiene que llamar al paciente para
   * acordar la hora. El asistente avisa de estos.
   *
   * La fecha de arriba NO se reescribe cuando la cita se mueve: la historia
   * guarda lo que se decidio ese dia, y el estado real se lee de la cita.
   */
  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  plannedAppointment?: Appointment | null;

  // --- CORRECCIÓN AQUÍ ---
  /**
   * Datos propios del rubro para ESTA sesion.
   *
   * Va en jsonb y no en una columna por campo porque cada rubro anota cosas
   * distintas y casi todas quedarian nulas en los demas:
   *
   *   psicologia  tecnicas aplicadas, tareas, estado del paciente,
   *               adherencia y reevaluacion de riesgo
   *   estetica    zonas tratadas, parametros del equipo, producto y lote,
   *               reacciones adversas
   *
   * Son datos que se leen cuando el paciente vuelve, no se agregan en
   * reportes, asi que no hace falta que sean columnas.
   */
  @Column({ type: 'jsonb', nullable: true })
  sessionDetails: Record<string, any> | null;

  @ManyToOne(() => Patient, (patient) => patient.clinicalHistory, { onDelete: 'CASCADE' })
  patient: Patient;
  // --- FIN DE LA CORRECCIÓN ---

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;
}