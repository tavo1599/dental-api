import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller'; // <-- Importa el controlador

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController], // <-- Añade el controlador
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}