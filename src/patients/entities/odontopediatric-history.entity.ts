import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity({ name: 'odontopediatric_histories' })
export class OdontopediatricHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- 1. Historial del Niño ---
  @Column({ type: 'text', nullable: true, comment: 'Enfermedades padecidas (varicela, rubeola, etc.)' })
  childhoodIllnesses: string;

  @Column({ type: 'boolean', nullable: true, comment: '¿Vacunas completas?' })
  vaccinesUpToDate: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Alergias conocidas (medicamentos, alimentos)' })
  allergies: string;

  @Column({ type: 'text', nullable: true, comment: 'Medicamentos que toma actualmente' })
  currentMedications: string;

  @Column({ type: 'text', nullable: true, comment: 'Cirugías u hospitalizaciones previas' })
  previousSurgeries: string;

  // --- 2. Historial Prenatal y Nacimiento ---
  @Column({ type: 'text', nullable: true, comment: 'Problemas durante el embarazo de la madre' })
  pregnancyIssues: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Tipo de parto (Natural, Cesárea)' })
  birthType: string;

  @Column({ type: 'text', nullable: true, comment: 'Problemas al nacer (prematuro, ictericia, etc.)' })
  birthComplications: string;

  // --- 3. Hábitos y Dieta ---
  @Column({ type: 'varchar', nullable: true, comment: 'Tipo de lactancia (Materna, Fórmula)' })
  feedingType: string;

  @Column({ type: 'boolean', default: false, comment: '¿Usó biberón?' })
  usedBottle: boolean;

  @Column({ type: 'boolean', default: false, comment: '¿Usó chupón?' })
  usedPacifier: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Hábitos (succión de dedo, morderse las uñas, etc.)' })
  oralHabits: string;

  // --- 4. Historial Dental Pediátrico ---
  @Column({ type: 'varchar', nullable: true, comment: 'Edad de erupción del primer diente (ej: 6 meses)' })
  firstToothAge: string;

  @Column({ type: 'date', nullable: true, comment: 'Fecha de la primera visita al dentista' })
  firstDentalVisit: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Experiencias dentales previas (traumas, etc.)' })
  previousDentalExperience: string;

  // --- Relación con el Paciente ---
  @OneToOne(() => Patient, patient => patient.odontopediatricHistory)
  @JoinColumn()
  patient: Patient;
}