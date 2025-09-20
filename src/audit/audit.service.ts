import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(logData: Partial<AuditLog>): Promise<void> {
    const logEntry = this.auditLogRepository.create(logData);
    await this.auditLogRepository.save(logEntry);
  }

  // --- NUEVA FUNCIÓN AÑADIDA ---
  async findAll(tenantId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['user'], // Cargamos la información del usuario que hizo la acción
      order: { timestamp: 'DESC' }, // Mostramos los más recientes primero
      take: 100, // Limitamos a los últimos 100 registros para no sobrecargar
    });
  }
}