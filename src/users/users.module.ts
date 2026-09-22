import { Module } from '@nestjs/common';
import { Branch } from '../branches/entities/branch.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Tenant } from '../tenants/entities/tenant.entity'; // <-- 1. Importa la entidad Tenant

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Branch]) // <-- 2. Añade Tenant aquí
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}