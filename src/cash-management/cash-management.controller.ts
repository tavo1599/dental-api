import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CashManagementService } from './cash-management.service';

@UseGuards(AuthGuard('jwt'))
@Controller('cash-management')
export class CashManagementController {
  constructor(private readonly cashService: CashManagementService) {}

  // ...
@Get('daily-summary')
getDailySummary(
  @Query('date') dateString: string, // Recibe el string
  @Req() req,
) {
  // Pasa el string directamente al servicio
  return this.cashService.getDailySummary(dateString, req.user.tenantId);
}
}