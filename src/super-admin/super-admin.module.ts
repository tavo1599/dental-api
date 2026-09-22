import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
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
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  // 3. Añade 'Patient' y 'Payment' a la lista de entidades
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Tenant, User, Announcement, Patient, Payment, ConsentTemplate]), 
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}