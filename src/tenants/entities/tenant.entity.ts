import { Column, Entity, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // --- NUEVOS CAMPOS PARA SITIO WEB (Website Builder) ---
  
  // El subdominio único: ej. 'clinica-sur'
  @Column({ unique: true, nullable: true })
  domainSlug: string; 

  // Configuración visual y contenido público
  @Column({ type: 'jsonb', nullable: true })
  websiteConfig: {
    primaryColor?: string;
    secondaryColor?: string;
    welcomeMessage?: string;
    aboutUs?: string;
    heroImageUrl?: string; 
    facebookUrl?: string;
    instagramUrl?: string;
    whatsappNumber?: string;
    showStaff?: boolean;
    addressCoordinates?: { lat: number, lng: number };
  };
  // -----------------------------------------------------

  @Column({ unique: true })
  schema: string;

    // --- CAMPOS PARA PLANES DE SUSCRIPCIÓN ---
  @Column({ default: 'profesional' })
  plan: string; // ej. 'basico', 'profesional', 'premium'

  @Column({ type: 'int', default: 10 })
  maxUsers: number; // Límite de usuarios según el plan
  // --- FIN ---

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ type: 'date', nullable: true })
  subscriptionStartDate: Date | null;

  @Column({ type: 'date', nullable: true })
  nextPaymentDate: Date | null;

  // --- CAMPOS PARA LA INTEGRACIÓN CON GOOGLE ---
  @Column({ type: 'text', nullable: true })
  googleAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleRefreshToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleCalendarId: string | null; // El ID del calendario a usar (ej. 'primary')

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;
  // --- FIN ---

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => Patient, patient => patient.tenant)
  patients: Patient[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}