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
  
  @Column({ unique: true, nullable: true })
  domainSlug: string; 

  /**
   * Se ha actualizado el tipo de websiteConfig para incluir:
   * - theme: Para las plantillas (modern, classic, minimal).
   * - subTitle: Para el texto bajo el título principal.
   * - services: El arreglo de especialidades que configuramos.
   * - Campos sociales y de horario.
   */
  @Column({ type: 'jsonb', nullable: true })
  websiteConfig: {
    theme?: string;
    primaryColor?: string;
    secondaryColor?: string;
    welcomeMessage?: string;
    subTitle?: string;
    aboutUs?: string;
    heroImageUrl?: string; 
    aboutUsImageUrl?: string;
    whatsappNumber?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
    mapsUrl?: string;
    schedule?: string;
    showStaff?: boolean;
    addressCoordinates?: { lat: number, lng: number };
    services?: { title: string; description: string; iconType: string }[];
  };

  // NUEVO: Campo vital para habilitar botones de Sembrar/Vaciar en el dashboard
  @Column({ name: 'isTest', type: 'boolean', default: false })
  isTest: boolean;

  // -----------------------------------------------------

  @Column({ unique: true })
  schema: string;

  @Column({ default: 'profesional' })
  plan: string; 

  @Column({ type: 'int', default: 10 })
  maxUsers: number; 

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

  @Column({ type: 'text', nullable: true })
  googleAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleRefreshToken: string | null;

  @Column({ type: 'text', nullable: true })
  googleCalendarId: string | null; 

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

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