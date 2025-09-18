import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentTemplate } from './entities/consent-template.entity';
import { ConsentTemplatesController } from './consent-templates.controller';
import { ConsentTemplatesService } from './consent-templates.service';
import { Patient } from '../patients/entities/patient.entity'; // <-- 1. Importa la entidad Patient

@Module({
  imports: [
    // 2. Añade 'Patient' a la lista de entidades
    TypeOrmModule.forFeature([ConsentTemplate, Patient]),
  ],
  controllers: [ConsentTemplatesController],
  providers: [ConsentTemplatesService],
})
export class ConsentTemplatesModule {}