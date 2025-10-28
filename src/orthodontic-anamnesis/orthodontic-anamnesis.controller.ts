import { Controller, Get, Patch, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrthodonticAnamnesisService } from './orthodontic-anamnesis.service';
import { UpdateOrthodonticAnamnesisDto } from './dto/update-orthodontic-anamnesis.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/orthodontic-anamnesis')
export class OrthodonticAnamnesisController {
  constructor(private readonly orthoService: OrthodonticAnamnesisService) {}

  @Get()
  get(@Param('patientId') patientId: string, @Req() req) {
    return this.orthoService.getForPatient(patientId, req.user.tenantId);
  }

  @Patch()
  update(
    @Param('patientId') patientId: string,
    @Body() dto: UpdateOrthodonticAnamnesisDto,
    @Req() req,
  ) {
    return this.orthoService.updateForPatient(dto, patientId, req.user.sub, req.user.tenantId);
  }
}
