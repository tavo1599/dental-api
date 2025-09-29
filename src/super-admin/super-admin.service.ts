import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { RegisterAuthDto } from '../auth/dto/register-auth.dto';
import { User } from '../users/entities/user.entity'; // Importa User
import { Announcement } from '../announcements/entities/announcement.entity'; // Importa
import { Patient } from '../patients/entities/patient.entity'; // Importa Patient
import { Payment } from '../payments/entities/payment.entity';
import { Between } from 'typeorm';
import { ConsentTemplate } from '../consent-templates/entities/consent-template.entity';
import { CreateConsentTemplateDto } from '../consent-templates/dto/create-consent-template.dto';
import { UpdateConsentTemplateDto } from '../consent-templates/dto/update-consent-template.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
    @InjectRepository(Announcement) // Inyecta el repositorio
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(ConsentTemplate)
    private readonly consentTemplateRepository: Repository<ConsentTemplate>,
    
  ) {}

async findAllTenants() {
  // Usamos el Query Builder para cargar relaciones y conteos
  return this.tenantRepository.createQueryBuilder('tenant')
    .leftJoinAndSelect('tenant.users', 'user')
    .loadRelationCountAndMap('tenant.patientCount', 'tenant.patients') // <-- Cuenta los pacientes
    .orderBy('tenant.createdAt', 'DESC')
    .getMany();
}

async getSystemWideKpis() {
    // Conteo total de pacientes sin filtrar por clínica
    const totalPatientCount = await this.patientRepository.count();

    // Ingresos totales del mes actual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyPayments = await this.paymentRepository.find({
      where: { paymentDate: Between(monthStart, monthEnd) }
    });
    const totalMonthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalPatientCount,
      totalMonthlyRevenue,
    };
  }
  

  async createTenant(registerDto: RegisterAuthDto) {
    const newUser = await this.authService.register(registerDto);
    // Al crear, establecemos las fechas de suscripción
    const tenant = await this.tenantRepository.findOneBy({ id: newUser.tenant.id });
    if (tenant) {
      tenant.subscriptionStartDate = new Date();
      const nextPayment = new Date();
      nextPayment.setMonth(nextPayment.getMonth() + 1);
      tenant.nextPaymentDate = nextPayment;
      await this.tenantRepository.save(tenant);
    }
    return newUser;
  }

  // --- NUEVA FUNCIÓN PARA ACTUALIZAR EL ESTADO ---
  async updateTenantStatus(tenantId: string, status: TenantStatus) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (tenant) {
      tenant.status = status;
      return this.tenantRepository.save(tenant);
    }
  }

  async getTenantGrowth() {
  const query = `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY') as month,
      COUNT(id) as count
    FROM tenants
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt") ASC;
  `;
  const result = await this.tenantRepository.query(query);

  // Formateamos para el gráfico
  return {
    labels: result.map((item: any) => item.month),
    data: result.map((item: any) => parseInt(item.count, 10)),
  };
}

async impersonate(userId: string) {
    const userToImpersonate = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'], // Carga la relación con el tenant
    });

    if (!userToImpersonate) {
      throw new NotFoundException('Usuario a personificar no encontrado.');
    }
    if (userToImpersonate.isSuperAdmin) {
      throw new UnauthorizedException('No se puede personificar a otro Super Admin.');
    }

    // Llamamos directamente al método de login del AuthService para generar un token para este usuario
    // Pasamos un objeto 'fake' que simula el DTO de login
    return this.authService.generateTokenForUser(userToImpersonate);
  }

  async postAnnouncement(message: string) {
    // Esta lógica de "upsert" asegura que solo haya un anuncio activo a la vez
    await this.announcementRepository.update({ isActive: true }, { isActive: false }); // Desactiva los viejos
    const newAnnouncement = this.announcementRepository.create({ message, isActive: true });
    return this.announcementRepository.save(newAnnouncement);
  }

  async clearAnnouncement() {
    return this.announcementRepository.update({ isActive: true }, { isActive: false });
  }

  findAllConsentTemplates() {
    return this.consentTemplateRepository.find({ order: { title: 'ASC' } });
  }

  createConsentTemplate(dto: CreateConsentTemplateDto) {
    const newTemplate = this.consentTemplateRepository.create(dto);
    return this.consentTemplateRepository.save(newTemplate);
  }

  async updateConsentTemplate(id: string, dto: UpdateConsentTemplateDto) {
    const template = await this.consentTemplateRepository.preload({ id, ...dto });
    if (!template) {
      throw new NotFoundException(`Plantilla con ID "${id}" no encontrada.`);
    }
    return this.consentTemplateRepository.save(template);
  }

  async removeConsentTemplate(id: string) {
    const result = await this.consentTemplateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Plantilla con ID "${id}" no encontrada.`);
    }
  }

  async updateTenantPlan(tenantId: string, dto: UpdatePlanDto) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException(`Clínica con ID "${tenantId}" no encontrada.`);
    }

    tenant.plan = dto.plan;
    tenant.maxUsers = dto.maxUsers;

    return this.tenantRepository.save(tenant);
  }

  async renewSubscription(tenantId: string) {
    const tenant = await this.tenantRepository.findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException(`Clínica con ID "${tenantId}" no encontrada.`);
    }
    
    // 1. Tomamos la fecha de pago actual como base.
    // Si por alguna razón no existe, usamos la fecha de hoy.
    const baseDate = tenant.nextPaymentDate ? new Date(tenant.nextPaymentDate) : new Date();

    // 2. Calculamos la nueva fecha de pago (un mes a partir de la fecha base).
    baseDate.setMonth(baseDate.getMonth() + 1);
    
    tenant.nextPaymentDate = baseDate;
    tenant.status = TenantStatus.ACTIVE; // La reactivamos si estaba suspendida

    return this.tenantRepository.save(tenant);
  }

}