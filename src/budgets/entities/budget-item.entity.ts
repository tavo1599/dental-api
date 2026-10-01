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

  /**
   * Sesiones que el especialista indica para ESTE paciente.
   *
   * No sale de ningun valor del catalogo a proposito: el mismo tratamiento
   * puede hacerse en 2 sesiones para uno y en 4 para otro, asi que fijarlo
   * en el servicio solo daria trabajo de mas.
   *
   * Las sesiones YA HECHAS no se guardan aqui: se cuentan de
   * treatment_session_logs, para que no haya un contador que se desincronice.
   */
  @Column({ type: 'int', default: 1 })
  sessionsTotal: number;

  // Cada item pertenece a UN presupuesto
  @ManyToOne(() => Budget, (budget) => budget.items, { onDelete: 'CASCADE' })
  budget: Budget;

  // Cada item se refiere a UN tratamiento del catálogo
  @ManyToOne(() => Treatment, { eager: true })
  treatment: Treatment;
}