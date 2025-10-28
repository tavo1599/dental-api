import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrthodonticAnamnesisController } from './orthodontic-anamnesis.controller';
import { OrthodonticAnamnesisService } from './orthodontic-anamnesis.service';
import { OrthodonticAnamnesis } from './entities/orthodontic-anamnesis.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrthodonticAnamnesis, Patient]), forwardRef(() => PatientsModule)],
  controllers: [OrthodonticAnamnesisController],
  providers: [OrthodonticAnamnesisService],
})
export class OrthodonticAnamnesisModule {}
