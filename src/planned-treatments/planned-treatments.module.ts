import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlannedTreatment } from './entities/planned-treatment.entity';
import { PlannedTreatmentsController } from './planned-treatments.controller';
import { PlannedTreatmentsService } from './planned-treatments.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlannedTreatment])],
  controllers: [PlannedTreatmentsController],
  providers: [PlannedTreatmentsService],
})
export class PlannedTreatmentsModule {}