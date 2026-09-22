import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { Branch } from './entities/branch.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, User])],
  controllers: [BranchesController],
  providers: [BranchesService],
  // TypeOrmModule se reexporta para que otros modulos (p.ej. el guard de
  // contexto de sede en AuthModule) puedan inyectar el repositorio de Branch.
  exports: [BranchesService, TypeOrmModule],
})
export class BranchesModule {}
