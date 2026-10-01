import { Tenant } from '../../tenants/entities/tenant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'treatments' })
export class Treatment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Ej: "Endodoncia Unirradicular"

  @Column('text', { nullable: true })
  description?: string;

  // Usamos 'decimal' para manejar dinero y evitar errores de redondeo
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

   @Column({ type: 'int', default: 30 }) // Duración en minutos, 30 por defecto
  duration: number;

  // Cada tratamiento pertenece a UNA clínica (tenant)
  @ManyToOne(() => Tenant)
  tenant: Tenant;
}