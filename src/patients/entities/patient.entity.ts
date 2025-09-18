// src/patients/entities/patient.entity.ts
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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

  // LA CLAVE: Cada paciente pertenece a UN solo tenant (clínica).
  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;
}