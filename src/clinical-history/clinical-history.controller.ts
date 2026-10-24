import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClinicalHistoryService } from './clinical-history.service';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller() // Dejamos la base vacía para tener flexibilidad total en las rutas
export class ClinicalHistoryController {
  constructor(private readonly clinicalHistoryService: ClinicalHistoryService) {}

  // --- NUEVA RUTA PARA EL ASISTENTE (Búsqueda Global) ---
  // URL: /clinical-history/reminders
  @Get('clinical-history/reminders')
  @Roles(UserRole.ADMIN, UserRole.BRANCH_ADMIN, UserRole.DENTIST, UserRole.ASSISTANT)
  findAllGlobal(@Req() req, @Query('date') date?: string) {
    // Busca recordatorios en toda la clínica (tenant)
    return this.clinicalHistoryService.findAllReminders(req.user.tenantId, date);
  }

  // --- RUTAS ORIGINALES (Compatibilidad con tu sistema actual) ---

  // URL: /patients/:patientId/history (POST)
  @Post('patients/:patientId/history')
  @Roles(UserRole.ADMIN, UserRole.BRANCH_ADMIN, UserRole.DENTIST)
  // La sede hace falta solo si se agenda la proxima cita en el momento: una
  // cita siempre ocurre en una sede concreta. Va a nivel de ruta y no de clase
  // para no cambiar el comportamiento de las demas.
  @UseGuards(BranchContextGuard)
  create(
    @Param('patientId') patientId: string,
    @Body() createDto: CreateClinicalHistoryEntryDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub; 
    return this.clinicalHistoryService.create(createDto, patientId, userId, tenantId, branchId);
  }

  // URL: /patients/:patientId/history (GET)
  @Get('patients/:patientId/history')
  findAllForPatient(@Param('patientId') patientId: string, @Req() req) {
    const { tenantId } = req.user;
    return this.clinicalHistoryService.findAllForPatient(patientId, tenantId);
  }

  // URL: /patients/:patientId/history/:entryId (PATCH)
  @Patch('patients/:patientId/history/:entryId')
  @Roles(UserRole.ADMIN, UserRole.BRANCH_ADMIN, UserRole.DENTIST)
  update(
    @Param('entryId') entryId: string,
    @Body() updateDto: Partial<CreateClinicalHistoryEntryDto>,
    @Req() req
  ) {
    return this.clinicalHistoryService.update(entryId, updateDto, req.user.tenantId);
  }

  // URL: /patients/:patientId/history/:entryId (DELETE)
  @Delete('patients/:patientId/history/:entryId')
  @Roles(UserRole.ADMIN, UserRole.BRANCH_ADMIN, UserRole.DENTIST)
  remove(@Param('entryId') entryId: string, @Req() req) {
    return this.clinicalHistoryService.remove(entryId, req.user.tenantId);
  }
}