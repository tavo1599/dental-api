import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'clinical_history_entries' })
export class ClinicalHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // La fecha se genera automáticamente al crear la entrada
  @CreateDateColumn()
  entryDate: Date;

  @Column('text')
  description: string; // Notas del odontólogo, diagnóstico, etc.

  @Column('text', { nullable: true })
  treatmentPerformed?: string; // Tratamiento realizado en esa visita

   @Column('text', { nullable: true })
  diagnosis?: string;

  @Column('text', { nullable: true })
  prescription?: string;

  @Column('text', { nullable: true })
  indications?: string;

  // Relación: Cada entrada pertenece a UN paciente
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) // Si se borra el paciente, se borra su historial
  patient: Patient;

  // Relación: Cada entrada fue creada por UN usuario (odontólogo)
  @ManyToOne(() => User)
  user: User;

  // Relación: Cada entrada pertenece a UN tenant
  @ManyToOne(() => Tenant)
  tenant: Tenant;
}