import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  create(
    @Param('patientId') patientId: string,
    @Body() createDto: CreatePrescriptionDto,
    @Req() req,
  ) {
    const { tenantId, sub: doctorId } = req.user;
    return this.prescriptionsService.create(createDto, patientId, doctorId, tenantId);
  }

  @Get()
  findAll(@Param('patientId') patientId: string, @Req() req) {
    return this.prescriptionsService.findAllForPatient(patientId, req.user.tenantId);
  }
}