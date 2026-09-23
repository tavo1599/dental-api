import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete, UseInterceptors } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AuditedAction } from '../audit/decorators/audited-action.decorator';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto'; // <-- Importa el nuevo DTO
import { UpdateOdontopediatricHistoryDto } from './dto/update-odontopediatric-history.dto';
import { UpdateOrthodonticHistoryDto } from './dto/update-orthodontic-history.dto';
import { UpdatePsychologyHistoryDto } from './dto/update-psychology-history.dto';
import { UpdateAestheticHistoryDto } from './dto/update-aesthetic-history.dto';
import { SpecialtyGuard } from '../auth/guards/specialty.guard';
import { RequiresSpecialty } from '../auth/decorators/requires-specialty.decorator';
import { ClinicSpecialty } from '../tenants/specialty';

@UseGuards(AuthGuard('jwt'))
@Controller('patients')
@UseInterceptors(AuditInterceptor)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  @Post()
  @AuditedAction('CREATE_PATIENT')
  create(@Body() createPatientDto: CreatePatientDto, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.create(createPatientDto, tenantId);
  }

  @Get()
  findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.patientsService.findAll(tenantId);
  }

  // --- ENDPOINTS PARA HISTORIAL MÉDICO AÑADIDOS ---

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

  // Solo la ve el rubro al que pertenece: el guardia lo impone en el
  // servidor, no solo escondiendo la pestana.
  @Get(':id/psychology-anamnesis')
  @RequiresSpecialty(ClinicSpecialty.PSYCHOLOGY)
  @UseGuards(SpecialtyGuard)
  getPsychologyHistory(@Param('id') id: string, @Req() req) {
    return this.patientsService.getPsychologyHistory(id, req.user.tenantId);
  }

  @Patch(':id/psychology-anamnesis')
  @RequiresSpecialty(ClinicSpecialty.PSYCHOLOGY)
  @UseGuards(SpecialtyGuard)
  @AuditedAction('UPDATE_PSYCHOLOGY_HISTORY')
  updatePsychologyHistory(
    @Param('id') id: string,
    @Body() dto: UpdatePsychologyHistoryDto,
    @Req() req,
  ) {
    return this.patientsService.updatePsychologyHistory(id, req.user.tenantId, dto);
  }

  // Solo la ve el rubro al que pertenece: el guardia lo impone en el
  // servidor, no solo escondiendo la pestana.
  @Get(':id/aesthetic-anamnesis')
  @RequiresSpecialty(ClinicSpecialty.AESTHETICS)
  @UseGuards(SpecialtyGuard)
  getAestheticHistory(@Param('id') id: string, @Req() req) {
    return this.patientsService.getAestheticHistory(id, req.user.tenantId);
  }

  @Patch(':id/aesthetic-anamnesis')
  @RequiresSpecialty(ClinicSpecialty.AESTHETICS)
  @UseGuards(SpecialtyGuard)
  @AuditedAction('UPDATE_AESTHETIC_HISTORY')
  updateAestheticHistory(
    @Param('id') id: string,
    @Body() dto: UpdateAestheticHistoryDto,
    @Req() req,
  ) {
    return this.patientsService.updateAestheticHistory(id, req.user.tenantId, dto);
  }

  @Get(':id/orthodontic-anamnesis')
  getOrthodonticHistory(@Param('id') id: string, @Req() req) {
    return this.patientsService.getOrthodonticHistory(id, req.user.tenantId);
  }

  @Patch(':id/orthodontic-anamnesis')
  @AuditedAction('UPDATE_ORTHODONTIC_HISTORY') // <-- Buena práctica
  updateOrthodonticHistory(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateOrthodonticHistoryDto, // <-- Usa el DTO que creamos
  ) {
    return this.patientsService.updateOrthodonticHistory(id, req.user.tenantId, dto);
  }

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