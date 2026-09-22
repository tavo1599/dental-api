import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentTimeDto } from './dto/update-appointment-time.dto';
import { AppointmentStatus } from './entities/appointment.entity';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';

// BranchContextGuard resuelve la sede de cada peticion a partir de la
// cabecera X-Branch-Id y la deja disponible via @CurrentBranch().
@UseGuards(AuthGuard('jwt'), BranchContextGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    const { tenantId } = req.user;
    return this.appointmentsService.create(createAppointmentDto, tenantId, branchId);
  }

@Get()
  findAll(
    @Req() req,
    @CurrentBranch() branchId: string | null,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { tenantId } = req.user;

    let statusFilter: AppointmentStatus[] | 'all' | undefined;

    if (status === 'all') {
      statusFilter = 'all';
    } else if (status) {
      statusFilter = status.split(',') as AppointmentStatus[];
    }

    return this.appointmentsService.findAll(tenantId, branchId, {
      doctorId,
      status: statusFilter,
      startDate,
      endDate,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentStatusDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    const { tenantId } = req.user;
    return this.appointmentsService.updateStatus(id, updateDto, tenantId, branchId);
  }

  @Patch(':id/time')
  updateTime(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentTimeDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.appointmentsService.updateTime(id, updateDto, req.user.tenantId, branchId);
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
findNextDayPending(@Req() req, @CurrentBranch() branchId: string | null) {
  return this.appointmentsService.findNextDayPending(req.user.tenantId, branchId);
}

@Delete(':id')
  @HttpCode(HttpStatus.OK) // Devuelve 200 OK en lugar de 204 No Content
  remove(
    @Param('id') id: string,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    // Ya no usamos RolesGuard, cualquier usuario autenticado puede borrar
    return this.appointmentsService.remove(id, req.user.tenantId, branchId);
  }

}