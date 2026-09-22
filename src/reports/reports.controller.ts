import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { FinancialReportDto } from './dto/financial-report.dto';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';
import { SettingsGuard } from '../auth/guards/settings.guard';
import { RequiresSetting } from '../auth/decorators/requires-setting.decorator';

@UseGuards(AuthGuard('jwt'), BranchContextGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Antes llevaba @Roles(ADMIN, BRANCH_ADMIN) fijo, y eso ignoraba el ajuste
   * "los doctores pueden ver reportes": aunque la clinica lo activara, la
   * guardia los seguia bloqueando. Ahora manda la configuracion. El valor
   * por defecto es false para doctores y asistentes, asi que quien no lo
   * haya tocado sigue igual que hasta hoy.
   */
  @Get('financial')
  @RequiresSetting('CanSeeReports')
  @UseGuards(SettingsGuard)
  getFinancialReport(
    @Query() query: FinancialReportDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    return this.reportsService.getFinancialReport(
      startDate,
      endDate,
      req.user.tenantId,
      branchId,
    );
  }
}