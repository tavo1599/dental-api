import { Treatment } from '../../treatments/entities/treatment.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Budget } from './budget.entity';

@Entity({ name: 'budget_items' })
export class BudgetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Guardamos el precio al momento de crear el presupuesto
  // para que no cambie si el precio del tratamiento se actualiza después.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtTimeOfBudget: number;

  @Column({ default: 1 })
  quantity: number;

  // Copia del nombre del tratamiento en el momento de crear el presupuesto.
  // Esto preserva el historial si el tratamiento se edita o se elimina más tarde.
  @Column({ nullable: true })
  treatmentName?: string;

  // Cada item pertenece a UN presupuesto
  @ManyToOne(() => Budget, (budget) => budget.items, { onDelete: 'CASCADE' })
  budget: Budget;

  // Cada item puede referirse a UN tratamiento del catálogo, pero la relación
  // es opcional y al eliminar el tratamiento la FK se pondrá a NULL.
  // Además mantenemos 'treatmentName' y 'priceAtTimeOfBudget' para preservar
  // el snapshot histórico del item.
  @ManyToOne(() => Treatment, { eager: true, nullable: true, onDelete: 'SET NULL' })
  treatment?: Treatment | null;
}