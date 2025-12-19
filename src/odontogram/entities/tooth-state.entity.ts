import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity({ name: 'tooth_states' })
export class ToothState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toothNumber: number;

  @Column()
  condition: string; // Ej: "Tratamiento Pulpar"

  @Column({ nullable: true })
  sub_type: string; // Ej: "Pulpotomía"

  @Column()
  abbreviation: string; // Ej: "PP"

  @Column()
  status: 'bueno' | 'malo' | 'evolucionado'; 

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;
}