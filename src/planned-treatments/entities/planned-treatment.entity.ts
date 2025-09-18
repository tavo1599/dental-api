import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ToothSurfaceState } from '../../odontogram/entities/tooth-surface-state.entity';
import { Treatment } from '../../treatments/entities/treatment.entity';
import { Patient } from '../../patients/entities/patient.entity';

@Entity({ name: 'planned_treatments' })
export class PlannedTreatment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Un tratamiento planeado pertenece a UN diagnóstico en una superficie dental
  @ManyToOne(() => ToothSurfaceState, { onDelete: 'CASCADE', eager: true })
  toothSurfaceState: ToothSurfaceState;

  // El tratamiento que se planea realizar
  @ManyToOne(() => Treatment)
  treatment: Treatment;

  // También pertenece a un paciente para facilitar las búsquedas
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  // Y a una clínica
  @ManyToOne(() => Tenant)
  tenant: Tenant;
}