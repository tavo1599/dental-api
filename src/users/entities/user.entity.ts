import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

export enum UserRole {
  /** Titular de la clinica: ve TODAS sus sedes y el consolidado. Solo uno. */
  ADMIN = 'admin',
  /** Admin de una sucursal concreta: solo su sede. Uno por sede. */
  BRANCH_ADMIN = 'branch_admin',
  DENTIST = 'dentist',
  ASSISTANT = 'assistant',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // select: false -> nunca se incluye en un find/findOne normal. Quien necesite
  // comparar la contrasena debe pedirlo con .addSelect('user.password_hash')
  // (ver auth.service.login y users.service.changePassword).
  @Column({ select: false })
  password_hash: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  phone?: string;

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

  // 👇 --- NUEVO: COLUMNA PARA CONTROL DE ACCESO --- 👇
  @Column({ type: 'boolean', default: true })
  isActive: boolean;
  // 👆 --- FIN --- 👆

  @ManyToOne(() => Tenant, { nullable: true, eager: true })
  tenant: Tenant | null;

  /**
   * Sedes a las que tiene acceso. Es N:M porque un doctor suele rotar entre
   * sucursales y no queremos duplicarle la cuenta.
   * NO es eager: se carga solo donde hace falta (ver jwt.strategy).
   */
  @ManyToMany(() => Branch, (branch) => branch.users)
  @JoinTable({
    name: 'user_branches',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'branchId', referencedColumnName: 'id' },
  })
  branches: Branch[];

  // Guarda el token para resetear la contraseña
  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken?: string | null;

  // Guarda la fecha y hora en que expira el token
  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date | null;
}