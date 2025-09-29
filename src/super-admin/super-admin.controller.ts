import { Controller, Get, UseGuards, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import { RegisterAuthDto } from '../auth/dto/register-auth.dto';
import { TenantStatus } from '../tenants/entities/tenant.entity';
import { CreateConsentTemplateDto } from '../consent-templates/dto/create-consent-template.dto';
import { UpdateConsentTemplateDto } from '../consent-templates/dto/update-consent-template.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@UseGuards(AuthGuard('jwt'), SuperAdminGuard) // Protege todo el controlador
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // --- Endpoints de Clínicas ---
  @Get('tenants')
  findAllTenants() {
    return this.superAdminService.findAllTenants();
  }

  @Post('tenants')
  createTenant(@Body() registerDto: RegisterAuthDto) {
    return this.superAdminService.createTenant(registerDto);
  }

  @Patch('tenants/:id/status')
  updateTenantStatus(
    @Param('id') id: string,
    @Body('status') status: TenantStatus,
  ) {
    return this.superAdminService.updateTenantStatus(id, status);
  }

  // --- Endpoints de Analíticas ---
  @Get('analytics/tenant-growth')
  getTenantGrowth() {
    return this.superAdminService.getTenantGrowth();
  }

  @Get('analytics/kpis')
  getSystemWideKpis() {
    return this.superAdminService.getSystemWideKpis();
  }

  // --- Endpoints de Anuncios ---
  @Post('announcement')
  postAnnouncement(@Body('message') message: string) {
    return this.superAdminService.postAnnouncement(message);
  }

  @Delete('announcement')
  clearAnnouncement() {
    return this.superAdminService.clearAnnouncement();
  }

  // --- Endpoint de Personificación ---
  @Post('impersonate/:userId')
  impersonate(@Param('userId') userId: string) {
    return this.superAdminService.impersonate(userId);
  }

  // --- Endpoints de GESTIÓN de Plantillas (Crear, Editar, Borrar) --

  @Post('consent-templates')
  createConsentTemplate(@Body() dto: CreateConsentTemplateDto) {
    return this.superAdminService.createConsentTemplate(dto);
  }

  @Patch('consent-templates/:id')
  updateConsentTemplate(@Param('id') id: string, @Body() dto: UpdateConsentTemplateDto) {
    return this.superAdminService.updateConsentTemplate(id, dto);
  }

  @Delete('consent-templates/:id')
  removeConsentTemplate(@Param('id') id: string) {
    return this.superAdminService.removeConsentTemplate(id);
  }

  @Patch('tenants/:id/plan')
  updateTenantPlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.superAdminService.updateTenantPlan(id, dto);
  }

  @Patch('tenants/:id/renew')
  renewSubscription(@Param('id') id: string) {
  return this.superAdminService.renewSubscription(id);
}
}