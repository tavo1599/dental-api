import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { OdontogramRecordType } from '../enums/record-type.enum';

@Entity({ name: 'dental_bridges' })
export class DentalBridge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  startTooth: number;

  @Column()
  endTooth: number;

  @Column({ default: 'fixed' })
  type: string; // 'fixed'

  @Column({ default: 'red' })
  color: string; // 'red', 'blue'

  @Column({
    type: 'enum',
    enum: OdontogramRecordType,
    default: OdontogramRecordType.EVOLUTION,
  })
  recordType: OdontogramRecordType;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;
}