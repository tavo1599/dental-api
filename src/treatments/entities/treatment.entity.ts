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
  /**
   * En cuantas sesiones se presta este servicio.
   *
   * 1 para lo que se hace de una vez. Mas para lo que se cobra por paquete:
   * terapia, tratamientos esteticos, tambien ortodoncia. Es solo el valor
   * sugerido; lo que manda en cada paciente es lo pactado en su presupuesto.
   */
  @Column({ type: 'int', default: 1 })
  defaultSessions: number;

  @ManyToOne(() => Tenant)
  tenant: Tenant;
}