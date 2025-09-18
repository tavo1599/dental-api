import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { OdontogramController } from './odontogram.controller';
import { OdontogramService } from './odontogram.service';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ToothSurfaceState, Patient])],
  controllers: [OdontogramController],
  providers: [OdontogramService],
})
export class OdontogramModule {}