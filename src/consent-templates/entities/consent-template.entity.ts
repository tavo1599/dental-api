import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}