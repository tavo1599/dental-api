import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { FinancialReportDto } from './dto/financial-report.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  @Roles(UserRole.ADMIN) // Solo los admins pueden ver reportes financieros
  @UseGuards(RolesGuard)
  getFinancialReport(@Query() query: FinancialReportDto, @Req() req) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    return this.reportsService.getFinancialReport(startDate, endDate, req.user.tenantId);
  }
}