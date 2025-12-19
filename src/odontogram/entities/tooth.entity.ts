import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ToothStatus } from '../../types/tooth-status.enum';
import { OdontogramRecordType } from '../enums/record-type.enum';

@Entity({ name: 'teeth' })
@Unique(['patient', 'toothNumber', 'recordType']) // Solo puede haber un registro por diente y por paciente
export class Tooth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toothNumber: number;

  // Esta columna guardará el estado que afecta a todo el diente
  @Column({
    type: 'enum',
    enum: ToothStatus,
    default: ToothStatus.HEALTHY,
  })
  status: ToothStatus;

  @Column({
    type: 'enum',
    enum: OdontogramRecordType,
    default: OdontogramRecordType.EVOLUTION, // Por defecto todo va al actual
  })
  recordType: OdontogramRecordType;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}