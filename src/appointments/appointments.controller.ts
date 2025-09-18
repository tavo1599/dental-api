import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentTimeDto } from './dto/update-appointment-time.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto, @Req() req) {
    const { tenantId } = req.user;
    return this.appointmentsService.create(createAppointmentDto, tenantId);
  }

  @Get()
  findAll(@Req() req) {
    const { tenantId } = req.user;
    return this.appointmentsService.findAll(tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentStatusDto,
    @Req() req,
  ) {
    const { tenantId } = req.user;
    return this.appointmentsService.updateStatus(id, updateDto, tenantId);
  }

   @Patch(':id/time')
  updateTime(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentTimeDto,
    @Req() req,
  ) {
    return this.appointmentsService.updateTime(id, updateDto, req.user.tenantId);
  }

  @Get('/patient/:patientId')
  findAllForPatient(
    @Param('patientId') patientId: string,
    @Req() req,
  ) {
    return this.appointmentsService.findAllForPatient(patientId, req.user.tenantId);
  }

  // En src/appointments/appointments.controller.ts
@Get('pending/next-day')
findNextDayPending(@Req() req) {
  return this.appointmentsService.findNextDayPending(req.user.tenantId);
}

}