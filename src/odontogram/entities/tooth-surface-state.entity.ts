import { Patient } from '../../patients/entities/patient.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PlannedTreatment } from '../../planned-treatments/entities/planned-treatment.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, OneToOne, JoinColumn } from 'typeorm';

// Las superficies de un diente
export enum ToothSurface {
  OCCLUSAL = 'occlusal',
  MESIAL = 'mesial',
  DISTAL = 'distal',
  VESTIBULAR = 'vestibular',
  LINGUAL = 'lingual',
  PALATAL = 'palatal', // Equivalente a lingual para dientes superiores
}

// Los posibles estados (puedes añadir más)
export enum ToothStatus {
  HEALTHY = 'healthy',           // Sano
  CARIES = 'caries',             // Caries
  FILLED = 'filled',             // Obturado / Curado
  SEALANT = 'sealant',           // Sellante
  FRACTURE = 'fracture',         // Fractura
  CROWN = 'crown',               // Corona
  ENDODONTICS = 'endodontics',   // Endodoncia
  IMPLANT = 'implant',           // Implante
  EXTRACTION_NEEDED = 'extraction_needed', // Extracción indicada
  EXTRACTED = 'extracted',       // Extraído / Ausente
}

// Asegura que solo haya un registro por superficie, por diente y por paciente
@Unique(['patient', 'toothNumber', 'surface'])
@Entity({ name: 'tooth_surface_states' })
export class ToothSurfaceState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toothNumber: number;

  @Column({ type: 'enum', enum: ToothSurface })
  surface: ToothSurface;

  @Column({ type: 'enum', enum: ToothStatus })
  status: ToothStatus;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  patient: Patient;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @OneToOne(() => PlannedTreatment)
  @JoinColumn()
  plannedTreatment: PlannedTreatment;
}