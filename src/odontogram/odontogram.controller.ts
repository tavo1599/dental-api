import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OdontogramService } from './odontogram.service';
import { UpdateOdontogramDto } from './dto/update-odontogram.dto';
import { CreateToothStateDto } from './dto/create-tooth-state.dto';
import { CreateBridgeDto } from './dto/create-bridge.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { OdontogramRecordType } from './enums/record-type.enum';

@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/odontogram')
export class OdontogramController {
  constructor(private readonly odontogramService: OdontogramService) {}

  @Get()
  getOdontogram(
      @Param('patientId') patientId: string, 
      @Req() req,
      @Query('type') type?: OdontogramRecordType // <-- Nuevo parámetro Query
  ) {
    const { tenantId } = req.user;
    // Si no envían type, el servicio usa EVOLUTION por defecto
    return this.odontogramService.getOdontogram(patientId, tenantId, type);
  }

  @Patch()
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  updateOdontogram(
    @Param('patientId') patientId: string,
    @Body() updateDto: UpdateOdontogramDto,
    @Req() req,
  ) {
    // El DTO ya incluye el recordType
    return this.odontogramService.updateOdontogram(updateDto, patientId, req.user.tenantId);
  }

  @Post('state')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  saveToothState(
    @Param('patientId') patientId: string,
    @Body() dto: CreateToothStateDto,
    @Req() req
  ) {
    return this.odontogramService.saveToothState(dto, patientId, req.user.tenantId);
  }

  @Delete('state/:id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  clearToothState(
    @Param('id') id: string,
    @Req() req
  ) {
    return this.odontogramService.clearToothState(id, req.user.tenantId);
  }

  @Post('bridge')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  saveBridge(
    @Param('patientId') patientId: string,
    @Body() dto: CreateBridgeDto,
    @Req() req
  ) {
    return this.odontogramService.saveBridge(dto, patientId, req.user.tenantId);
  }

  @Delete('bridge/:bridgeId')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBridge(
    @Param('bridgeId') bridgeId: string,
    @Req() req
  ) {
    return this.odontogramService.removeBridge(bridgeId, req.user.tenantId);
  }
}