import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { Patient } from '../patients/entities/patient.entity'; // <-- 1. Importa Patient
import { Payment } from '../payments/entities/payment.entity'; // <-- 2. Importa Payment
import { ConsentTemplate } from '../consent-templates/entities/consent-template.entity';

@Module({
  // 3. Añade 'Patient' y 'Payment' a la lista de entidades
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Announcement, Patient, Payment, ConsentTemplate]), 
    AuthModule
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}