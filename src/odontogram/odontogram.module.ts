import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OdontogramController } from './odontogram.controller';
import { OdontogramService } from './odontogram.service';
import { ToothSurfaceState } from './entities/tooth-surface-state.entity';
import { Tooth } from './entities/tooth.entity';
import { ToothState } from './entities/tooth-state.entity'; // <-- 1. Importa la nueva entidad
import { DentalBridge } from './entities/dental-bridge.entity'; 
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ToothSurfaceState, 
      Tooth, 
      ToothState,
      DentalBridge
    ]),
    PatientsModule,
  ],
  controllers: [OdontogramController],
  providers: [OdontogramService],
})
export class OdontogramModule {}