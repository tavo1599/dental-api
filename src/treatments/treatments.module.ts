import { Module } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { TreatmentsController } from './treatments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Treatment } from './entities/treatment.entity';
import { BudgetItem } from '../budgets/entities/budget-item.entity';
import { PlannedTreatment } from '../planned-treatments/entities/planned-treatment.entity';

@Module({
  // BudgetItem y PlannedTreatment son solo de lectura aqui: se usan para contar
  // en cuantos sitios esta en uso un tratamiento antes de rechazar su borrado.
  imports: [TypeOrmModule.forFeature([Treatment, BudgetItem, PlannedTreatment])],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
})
export class TreatmentsModule {}
