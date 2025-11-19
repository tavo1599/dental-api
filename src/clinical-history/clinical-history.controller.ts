import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClinicalHistoryService } from './clinical-history.service';
import { CreateClinicalHistoryEntryDto } from './dto/create-clinical-history-entry.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'))
// Mantenemos tu ruta original
@Controller('patients/:patientId/history')
export class ClinicalHistoryController {
  constructor(private readonly clinicalHistoryService: ClinicalHistoryService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  create(
    @Param('patientId') patientId: string,
    @Body() createDto: CreateClinicalHistoryEntryDto,
    @Req() req,
  ) {
    // Obtenemos tenant y user del request (JWT)
    // Nota: req.user.sub suele ser el ID del usuario, o req.user.id dependiendo de tu estrategia JWT
    const tenantId = req.user.tenantId;
    const userId = req.user.id || req.user.sub; 

    // Llamamos al servicio con los 4 argumentos que espera
    return this.clinicalHistoryService.create(createDto, patientId, userId, tenantId);
  }

  @Get()
  findAll(@Param('patientId') patientId: string, @Req() req) {
    const { tenantId } = req.user;
    // Llamamos a tu método original
    return this.clinicalHistoryService.findAllForPatient(patientId, tenantId);
  }

  // --- NUEVOS ENDPOINTS ---

  @Patch(':entryId')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  update(
    @Param('entryId') entryId: string,
    @Body() updateDto: Partial<CreateClinicalHistoryEntryDto>,
  ) {
    return this.clinicalHistoryService.update(entryId, updateDto);
  }

  @Delete(':entryId')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('entryId') entryId: string) {
    return this.clinicalHistoryService.remove(entryId);
  }
}