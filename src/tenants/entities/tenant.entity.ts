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

  @Column({ unique: true, nullable: true })
  domainSlug: string; 

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

  /**
   * SISTEMA DE REGLAS DINÁMICO (Expandible)
   * Aquí guardamos qué puede hacer cada rol en esta clínica específica.
   * Si en el futuro quieres bloquear "Borrar Citas", solo agregas la llave aquí.
   */
  @Column({ type: 'jsonb', nullable: true, default: {
    // Permisos para Doctores
    dentistsCanSeePrices: true,
    dentistsCanManageBudgets: true,
    dentistsCanSeeReports: false,      // Nuevo: Reportes bloqueados por defecto
    dentistsCanManageTreatments: true,
    dentistsCanSeeDashboardStats: true, // Nuevo: Balances en Dashboard

    // Permisos para Asistentes
    assistantsCanSeePrices: true,
    assistantsCanManageBudgets: true,
    assistantsCanSeeReports: false,    // Nuevo
    assistantsCanManageTreatments: false, // Nuevo: Asistentes no suelen crear tipos de tratamientos
    assistantsCanSeeDashboardStats: false // Nuevo: Por seguridad financiera
  }})
  systemSettings: {
    // Precios y Presupuestos
    dentistsCanSeePrices?: boolean;
    dentistsCanManageBudgets?: boolean;
    assistantsCanSeePrices?: boolean;
    assistantsCanManageBudgets?: boolean;

    // Reportes y Estadísticas
    dentistsCanSeeReports?: boolean;
    assistantsCanSeeReports?: boolean;
    dentistsCanSeeDashboardStats?: boolean;
    assistantsCanSeeDashboardStats?: boolean;

    // Catálogo de Tratamientos (Configuración de precios base)
    dentistsCanManageTreatments?: boolean;
    assistantsCanManageTreatments?: boolean;
  };

  @Column({ name: 'isTest', type: 'boolean', default: false })
  isTest: boolean;

  /**
   * Modulo de sucursales. Apagado por defecto: una clinica solo lo ve cuando
   * el super admin se lo habilita.
   *
   * Vive en su PROPIA columna y no en systemSettings a proposito: ese jsonb lo
   * edita el admin de la clinica desde Ajustes, asi que podria activarselo el
   * mismo. Esto solo se cambia desde el panel de super admin.
   *
   * Con la bandera apagada la clinica sigue teniendo su "Sede Principal" y todo
   * funciona igual: lo unico que cambia es que no ve la interfaz de sedes.
   */
  @Column({ type: 'boolean', default: false })
  branchesEnabled: boolean;

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

  /**
   * Dia del mes en que le toca pagar (1-31).
   *
   * Se guarda aparte de nextPaymentDate porque hay meses que no tienen ese
   * dia: a quien paga los 31 se le cobra el 28 de febrero, pero en marzo debe
   * volver al 31. Si el dia se dedujera de la fecha anterior se quedaria
   * pegado al 28 para siempre y el cobro se iria corriendo solo.
   */
  @Column({ type: 'int', nullable: true })
  billingDay: number | null;

  /**
   * Ultimo dia en que se le mando un aviso de pago. Solo sirve para no
   * repetir el correo si el proceso diario corre dos veces el mismo dia
   * (un reinicio del servidor, por ejemplo).
   */
  @Column({ type: 'date', nullable: true })
  lastPaymentNoticeAt: Date | null;

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