import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionsService } from './sessions.service';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';
import { AuditedAction } from '../audit/decorators/audited-action.decorator';
import { SpecialtyGuard } from '../auth/guards/specialty.guard';
import { RequiresSpecialty } from '../auth/decorators/requires-specialty.decorator';
import { ClinicSpecialty } from '../tenants/specialty';

/**
 * Sesiones de los paquetes de un paciente.
 *
 * Solo para los rubros que cobran por sesiones. En odontologia un tratamiento
 * se cobra por pieza o por plan, no por sesion, asi que esto no aplica.
 *
 * Se restringe en el servidor y no solo escondiendo el boton: es la misma
 * leccion que los permisos de systemSettings.
 */
@UseGuards(AuthGuard('jwt'), BranchContextGuard, SpecialtyGuard)
@RequiresSpecialty(ClinicSpecialty.PSYCHOLOGY, ClinicSpecialty.AESTHETICS)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /** Paquetes del paciente con su avance. */
  @Get('patient/:patientId')
  findForPatient(@Param('patientId') patientId: string, @Req() req) {
    return this.sessionsService.findPackagesForPatient(
      patientId,
      req.user.tenantId,
    );
  }

  @Post('item/:budgetItemId')
  @AuditedAction('REGISTER_TREATMENT_SESSION')
  register(
    @Param('budgetItemId') budgetItemId: string,
    @Body() body: { performedAt?: string; notes?: string },
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.sessionsService.registerSession(
      budgetItemId,
      req.user.tenantId,
      branchId,
      req.user.id,
      body ?? {},
    );
  }

  /** Deshace una sesion registrada por error. */
  @Delete(':sessionId')
  @AuditedAction('DELETE_TREATMENT_SESSION')
  remove(@Param('sessionId') sessionId: string, @Req() req) {
    return this.sessionsService.removeSession(
      sessionId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
