import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  DENTIST = 'dentist',
  ASSISTANT = 'assistant',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  fullName: string;

    // --- AÑADE ESTA COLUMNA ---
  @Column({ nullable: true })
  phone?: string;
  // --- FIN ---


  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DENTIST,
  })
  role: UserRole;

  @Column({ nullable: true })
  specialty: string; // Ej: "Ortodoncista", "Odontopediatra"

  @Column({ nullable: true })
  cmp: string; // Colegio Odontológico / Licencia

  @Column({ nullable: true })
  photoUrl: string; // Foto de perfil del doctor

  @Column({ type: 'text', nullable: true })
  bio: string; // Breve descripción (opcional)

  @Column({ type: 'boolean', default: false })
  isSuperAdmin: boolean;
  // --- FIN ---

  @ManyToOne(() => Tenant, { nullable: true, eager: true })
  tenant: Tenant | null;

   // Guarda el token para resetear la contraseña
  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken?: string | null;

  // Guarda la fecha y hora en que expira el token
  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date | null;
}