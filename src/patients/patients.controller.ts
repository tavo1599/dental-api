import { 
  Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete, UseInterceptors 
  // ¡No necesitamos @Query!
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AuditedAction } from '../audit/decorators/audited-action.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
// ¡Ya no importamos BudgetsService!
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { UpdateOdontopediatricHistoryDto } from './dto/update-odontopediatric-history.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('patients')
@UseInterceptors(AuditInterceptor)
export class PatientsController {
  
  // --- CONSTRUCTOR CORREGIDO ---
  // Se eliminó 'budgetsService' de aquí
  constructor(
    private readonly patientsService: PatientsService
  ) {}
  // --- FIN DE LA CORRECCIÓN ---

  @Post()
  @AuditedAction('CREATE_PATIENT')
  create(@Body() createPatientDto: CreatePatientDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.create(createPatientDto, tenantId);
  }

  // --- findAll VUELVE A TU VERSIÓN ORIGINAL ---
  @Get()
  findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.findAll(tenantId);
  }
  // --- FIN ---

  // --- ENDPOINT DUPLICADO ELIMINADO ---
  // La ruta 'GET :id/budgets' se eliminó
  // --- FIN ---

  // --- Endpoints para Historial Médico y Pediátrico ---
  @Get(':id/medical-history')
  getMedicalHistory(@Param('id') id: string, @Req() req) {
    return this.patientsService.getMedicalHistory(id, req.user.tenantId);
  }
  
  @Patch(':id/medical-history')
  @AuditedAction('UPDATE_MEDICAL_HISTORY')
  updateMedicalHistory(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateMedicalHistoryDto,
  ) {
    return this.patientsService.updateMedicalHistory(id, req.user.tenantId, dto);
  }
  
  @Get(':id/odontopediatric-history')
  getOdontopediatricHistory(@Param('id') id: string, @Req() req) {
    return this.patientsService.getOdontopediatricHistory(id, req.user.tenantId);
  }

  @Patch(':id/odontopediatric-history')
  @AuditedAction('UPDATE_ODONTOPEDIATRIC_HISTORY')
  updateOdontopediatricHistory(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateOdontopediatricHistoryDto,
  ) {
    return this.patientsService.updateOdontopediatricHistory(id, req.user.tenantId, dto);
  }
  // --- Fin Endpoints Historial ---

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @AuditedAction('UPDATE_PATIENT')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.update(id, updatePatientDto, tenantId);
  }

  @Delete(':id')
  @AuditedAction('DELETE_PATIENT')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.remove(id, tenantId);
  }
}