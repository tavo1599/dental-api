import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { User } from '../users/entities/user.entity'; // <-- 1. Importa la entidad User
import { AuthModule } from '../auth/auth.module';     // <-- 2. Importa el AuthModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User]), // <-- 3. Añade User aquí
    AuthModule,                               // <-- 4. Añade AuthModule aquí
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}