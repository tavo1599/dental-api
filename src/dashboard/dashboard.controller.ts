import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req) {
    return this.dashboardService.getSummary(req.user.tenantId);
  }

  @Get('monthly-revenue')
  getMonthlyRevenue(@Req() req) {
    return this.dashboardService.getMonthlyRevenue(req.user.tenantId);
  }

  @Get('appointment-status')
getAppointmentStatusSummary(@Req() req) {
  return this.dashboardService.getAppointmentStatusSummary(req.user.tenantId);
}
}