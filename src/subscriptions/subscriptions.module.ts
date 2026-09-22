import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { SubscriptionsService } from './subscriptions.service';

/**
 * No tiene controlador propio a proposito: lo unico que se puede pedir desde
 * fuera es la simulacion, y eso ya vive en el panel de super admin junto al
 * resto de la gestion de clinicas.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User]), MailModule],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
