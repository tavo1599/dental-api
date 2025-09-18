import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'cie10_codes' })
export class Cie10Code {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // ej. "K02.1"

  @Column()
  description: string; // ej. "Caries de la dentina"
}