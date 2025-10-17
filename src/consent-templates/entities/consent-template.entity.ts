import { 
  Column, 
  Entity, 
  PrimaryGeneratedColumn, 
  ManyToOne 
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'consent_templates' })
export class ConsentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // Ej: "Consentimiento para Exodoncia"

  @Column('text')
  content: string; // El cuerpo del texto, con placeholders como {{patientName}}

  @Column({ default: false })
  forMinor: boolean; // True si es para apoderado de menor de edad

  @Column({ type: 'varchar', nullable: true })
  category: string;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  tenant: Tenant | null; // Nulo si es una plantilla del sistema
}
