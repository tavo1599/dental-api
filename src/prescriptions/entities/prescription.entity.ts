import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'prescriptions' })
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  prescriptionDate: Date;

  @Column('text')
  medication: string; // Nombre del medicamento, dosis y frecuencia

  @Column('text')
  indications: string; // Indicaciones de uso para el paciente

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => User)
  doctor: User; // Doctor que emite la receta

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}