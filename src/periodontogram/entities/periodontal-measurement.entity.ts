import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Asegura que solo haya un registro periodontal por diente y por paciente
@Unique(['patient', 'toothNumber'])
@Entity({ name: 'periodontal_measurements' })
export class PeriodontalMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toothNumber: number;

  // Profundidad de la bolsa (6 mediciones por diente)
  @Column({ type: 'smallint', nullable: true })
  vestibularDistal?: number;
  @Column({ type: 'smallint', nullable: true })
  vestibularMedial?: number;
  @Column({ type: 'smallint', nullable: true })
  vestibularMesial?: number;
  @Column({ type: 'smallint', nullable: true })
  lingualDistal?: number;
  @Column({ type: 'smallint', nullable: true })
  lingualMedial?: number;
  @Column({ type: 'smallint', nullable: true })
  lingualMesial?: number;

  // Otros indicadores
  @Column({ default: false })
  bleeding: boolean; // Sangrado al sondaje

  @Column({ default: false })
  suppuration: boolean; // Supuración

  @Column({ type: 'smallint', default: 0 })
  mobility: number; // Grado de movilidad (0, 1, 2, 3)

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}