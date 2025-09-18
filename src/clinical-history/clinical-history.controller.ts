import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClinicalHistoryService } from './clinical-history.service';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'))
// Todas las rutas aquí estarán anidadas bajo /patients/:patientId/history
@Controller('patients/:patientId/history')
export class ClinicalHistoryController {
  constructor(private readonly clinicalHistoryService: ClinicalHistoryService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DENTIST) // <-- Solo Admins y Doctores
  @UseGuards(RolesGuard)                   // <-- Aplica la guarda
  create(
    @Param('patientId') patientId: string,
    @Body() createDto: CreateClinicalHistoryEntryDto,
    @Req() req,
  ) {
    const { tenantId, sub: userId } = req.user;
    return this.clinicalHistoryService.create(createDto, patientId, userId, tenantId);
  }

  @Get()
  findAll(@Param('patientId') patientId: string, @Req() req) {
    const { tenantId } = req.user;
    return this.clinicalHistoryService.findAllForPatient(patientId, tenantId);
  }
}