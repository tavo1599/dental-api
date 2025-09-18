import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { PeriodontogramController } from './periodontogram.controller';
import { PeriodontogramService } from './periodontogram.service';
import { PeriodontalMeasurement } from './entities/periodontal-measurement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodontalMeasurement, Patient])],
  controllers: [PeriodontogramController],
  providers: [PeriodontogramService],
})
export class PeriodontogramModule {}