import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

// Enum para definir las 6 ubicaciones de medición por diente
export enum SiteLocation {
  MESIOBUCCAL = 'mesiobuccal',
  BUCCAL = 'buccal',
  DISTOBUCCAL = 'distobuccal',
  MESIOLINGUAL = 'mesiolingual',
  LINGUAL = 'lingual',
  DISTOLINGUAL = 'distolingual',
}

@Entity({ name: 'periodontal_measurements' })
export class PeriodontalMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date; // Fecha en que se tomó la medición

  @Column()
  toothNumber: number;

  @Column({ type: 'enum', enum: SiteLocation })
  site: SiteLocation; // Una de las 6 ubicaciones

  @Column({ type: 'int', nullable: true })
  probingDepth: number | null; // Profundidad de Sondaje (mm)

  @Column({ type: 'int', nullable: true })
  gingivalMargin: number | null; // Margen Gingival (mm)

  @Column({ default: false })
  bleedingOnProbing: boolean; // Sangrado al Sondaje

  @Column({ default: false })
  suppuration: boolean; // Supuración (Pus)

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}