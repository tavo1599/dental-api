import { Controller, Get, Body, Param, UseGuards, Req, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PeriodontogramService } from './periodontogram.service';
import { UpdatePeriodontogramDto } from './dto/update-periodontogram.dto';
import { OdontogramEnabledGuard } from '../auth/guards/odontogram-enabled.guard';

@UseGuards(AuthGuard('jwt'), OdontogramEnabledGuard)
@Controller('patients/:patientId/periodontogram')
export class PeriodontogramController {
  constructor(private readonly periodontogramService: PeriodontogramService) {}

  @Get()
  getPeriodontogram(@Param('patientId') patientId: string, @Req() req) {
    return this.periodontogramService.getPeriodontogram(patientId, req.user.tenantId);
  }

  @Patch()
  updatePeriodontogram(
    @Param('patientId') patientId: string,
    @Body() updateDto: UpdatePeriodontogramDto,
    @Req() req,
  ) {
    return this.periodontogramService.updatePeriodontogram(updateDto, patientId, req.user.tenantId);
  }
}