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

/**
 * Sesiones de los paquetes de un paciente.
 *
 * Sirve a cualquier rubro: psicologia y estetica son los que cobran por
 * sesiones casi siempre, pero una ortodoncia dental tambien se presta en
 * varias citas, asi que no se restringe por especialidad.
 */
@UseGuards(AuthGuard('jwt'), BranchContextGuard)
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
    return this.sessionsService.removeSession(sessionId, req.user.tenantId);
  }
}
