import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

// Importamos todas las entidades que vamos a manipular
import { Patient } from '../patients/entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Budget } from '../budgets/entities/budget.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Tooth } from '../odontogram/entities/tooth.entity';
import { ToothSurfaceState } from '../odontogram/entities/tooth-surface-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient, 
      Appointment, 
      Budget, 
      Tenant, 
      User, 
      Tooth, 
      ToothSurfaceState
    ])
  ],
  controllers: [DemoController],
  providers: [DemoService]
})
export class DemoModule {}