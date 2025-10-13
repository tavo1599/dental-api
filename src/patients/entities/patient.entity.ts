// src/patients/entities/patient.entity.ts
import { Tenant } from '../../tenants/entities/tenant.entity';
import { MedicalHistory } from './medical-history.entity';
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity({ name: 'patients' })
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  dni: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column()
  phone: string;

  @Column({ nullable: true }) // El email puede ser opcional
  email?: string;
  
  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  occupation?: string;

  @Column({ nullable: true })
  emergencyContactName?: string;

  @Column({ nullable: true })
  emergencyContactPhone?: string;

  @Column('text', { nullable: true })
  allergies?: string;

  // --- AÑADE ESTOS NUEVOS CAMPOS ---
  @Column({ nullable: true })
  department?: string; // Departamento

  @Column({ nullable: true })
  province?: string; // Provincia

  @Column({ nullable: true })
  district?: string; // Distrito

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column('text', { nullable: true })
  relevantMedicalHistory?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  category: string; // Ej: 'O', 'OI', 'I'

  @Column({ type: 'varchar', length: 20, nullable: true })
  fileCode: string; // Ej: '00123'

  // LA CLAVE: Cada paciente pertenece a UN solo tenant (clínica).
  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => MedicalHistory, medicalHistory => medicalHistory.patient, { cascade: true })
  medicalHistory: MedicalHistory;
}