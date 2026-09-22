import { Module } from '@nestjs/common';
import { Branch } from '../branches/entities/branch.entity';
import { AdminTransfer } from './entities/admin-transfer.entity';
import { AdminTransferService } from './admin-transfer.service';
import { MailModule } from '../mail/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Tenant } from '../tenants/entities/tenant.entity'; // <-- 1. Importa la entidad Tenant

@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([User, Tenant, Branch, AdminTransfer]) // <-- 2. Añade Tenant aquí
  ],
  controllers: [UsersController],
  providers: [UsersService, AdminTransferService],
  exports: [AdminTransferService],
})
export class UsersModule {}