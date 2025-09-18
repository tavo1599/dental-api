import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial-summary')
  getFinancialSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req,
  ) {
    // Convertimos los strings a objetos Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.reportsService.getFinancialSummary(start, end, req.user.tenantId);
  }
}