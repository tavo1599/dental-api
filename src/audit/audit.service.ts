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
}