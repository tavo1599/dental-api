import { Controller, Get, Body, Param, UseGuards, Req, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OdontogramService } from './odontogram.service';
import { UpdateOdontogramDto } from './dto/update-odontogram.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/odontogram')
export class OdontogramController {
  constructor(private readonly odontogramService: OdontogramService) {}

  @Get()
  getOdontogram(@Param('patientId') patientId: string, @Req() req) {
    const { tenantId } = req.user;
    return this.odontogramService.getOdontogram(patientId, tenantId);
  }

  @Patch()
  @Roles(UserRole.ADMIN, UserRole.DENTIST) // <-- Solo Admins y Doctores
  @UseGuards(RolesGuard)                   // <-- Aplica la guarda
  updateOdontogram(
    @Param('patientId') patientId: string,
    @Body() updateDto: UpdateOdontogramDto,
    @Req() req,
  ) {
    const { tenantId } = req.user;
    return this.odontogramService.updateOdontogram(updateDto, patientId, tenantId);
  }
}