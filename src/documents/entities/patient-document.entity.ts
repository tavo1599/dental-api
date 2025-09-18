import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'patient_documents' })
export class PatientDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string; // Nombre original del archivo

  @Column()
  filePath: string; // Ruta donde se guarda en el servidor

  @Column()
  fileType: string; // ej. 'application/pdf', 'image/jpeg'

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}