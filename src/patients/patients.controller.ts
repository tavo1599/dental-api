// src/patients/patients.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../auth/decorators/roles.decorator'; // <-- Importa esto
import { RolesGuard } from '../auth/guards/roles.guard';   // <-- Importa esto
import { UserRole } from '../users/entities/user.entity'; // <-- Importa esto
import { AuditedAction } from '../audit/decorators/audited-action.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';

@UseGuards(AuthGuard('jwt')) // Protege TODAS las rutas de este controlador
@Controller('patients')
@UseInterceptors(AuditInterceptor)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService, private readonly budgetsService: BudgetsService,) {}

  @Post()
  @AuditedAction('CREATE_PATIENT')
  create(@Body() createPatientDto: CreatePatientDto, @Req() req) {
    const tenantId = req.user.tenantId; // Obtenemos el tenantId del token
    return this.patientsService.create(createPatientDto, tenantId);
  }

  @Get()
  findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.findAll(tenantId);
  }

    @Get(':id/budgets')
  findAllBudgetsForPatient(@Param('id') id: string, @Req() req) {
    // Reutilizamos la lógica que ya existe en BudgetsService
    return this.budgetsService.findAllForPatient(id, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.findOne(id, tenantId);
  }


  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.update(id, updatePatientDto, tenantId);

  }

  @Delete(':id')
  @AuditedAction('DELETE_PATIENT')
  @Roles(UserRole.ADMIN) // Solo permite el rol de ADMIN
  @UseGuards(RolesGuard)   // Aplica nuestra nueva guarda de roles
  remove(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.remove(id, tenantId);
  }
}