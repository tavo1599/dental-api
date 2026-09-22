import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { SettingsGuard } from '../auth/guards/settings.guard';
import { RequiresSetting } from '../auth/decorators/requires-setting.decorator';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';

/**
 * BranchContextGuard va aqui porque el panel es lo primero que se ve al entrar:
 * sin el, un doctor de una sucursal veia la agenda y los ingresos de TODA la
 * clinica. Con el, cada quien ve su sede y solo el titular ve el consolidado.
 */
@UseGuards(AuthGuard('jwt'), BranchContextGuard, SettingsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Sin @RequiresSetting a proposito: el resumen trae la agenda del dia y los
   * cumpleanos ademas de las cifras, y eso lo necesita todo el mundo. El
   * servicio recorta lo economico segun el permiso.
   */
  @Get('summary')
  getSummary(@Req() req, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getSummary(req.user.tenantId, branchId, req.user);
  }

  /** Solo cifras: aqui si se corta el acceso entero. */
  @Get('monthly-revenue')
  @RequiresSetting('CanSeeDashboardStats')
  getMonthlyRevenue(@Req() req, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getMonthlyRevenue(req.user.tenantId, branchId);
  }

  /** Conteo de citas por estado: no es informacion economica. */
  @Get('appointment-status')
  getAppointmentStatusSummary(@Req() req, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getAppointmentStatusSummary(
      req.user.tenantId,
      branchId,
    );
  }
}
