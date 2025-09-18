import { Controller, Post, Body, Get, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlannedTreatmentsService } from './planned-treatments.service';
import { CreatePlannedTreatmentDto } from './dto/create-planned-treatment.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('planned-treatments')
export class PlannedTreatmentsController {
  constructor(private readonly plannedTreatmentsService: PlannedTreatmentsService) {}

  @Post()
  create(@Body() createDto: CreatePlannedTreatmentDto, @Req() req) {
    return this.plannedTreatmentsService.create(createDto, req.user.tenantId);
  }

  @Get('patient/:patientId')
  findAllForPatient(@Param('patientId') patientId: string, @Req() req) {
    return this.plannedTreatmentsService.findAllForPatient(patientId, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plannedTreatmentsService.remove(id);
  }
}