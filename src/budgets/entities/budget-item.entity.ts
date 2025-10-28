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

  // Cada item pertenece a UN presupuesto
  @ManyToOne(() => Budget, (budget) => budget.items, { onDelete: 'CASCADE' })
  budget: Budget;

  // Cada item se refiere a UN tratamiento del catálogo
  @ManyToOne(() => Treatment, { eager: true })
  treatment: Treatment;
}