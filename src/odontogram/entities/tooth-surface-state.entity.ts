import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ToothStatus } from '../../types/tooth-status.enum';
import { OdontogramRecordType } from '../enums/record-type.enum';

@Entity({ name: 'tooth_surface_states' })
@Unique(['patient', 'toothNumber', 'surface', 'recordType'])
export class ToothSurfaceState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toothNumber: number;

  @Column()
  surface: string;

  @Column({
    type: 'enum',
    enum: ToothStatus,
  })
  status: ToothStatus;

  @Column({
    type: 'enum',
    enum: OdontogramRecordType,
    default: OdontogramRecordType.EVOLUTION,
  })
  recordType: OdontogramRecordType;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}