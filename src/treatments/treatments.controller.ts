import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { AuthGuard } from '@nestjs/passport';
import { SettingsGuard } from '../auth/guards/settings.guard';
import { RequiresSetting } from '../auth/decorators/requires-setting.decorator';

@UseGuards(AuthGuard('jwt'), SettingsGuard)
@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Post()
  @RequiresSetting('CanManageTreatments')
  create(@Body() createDto: CreateTreatmentDto, @Req() req) {
    return this.treatmentsService.create(createDto, req.user.tenantId);
  }

  @Get()
  findAll(@Req() req) {
    return this.treatmentsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.treatmentsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @RequiresSetting('CanManageTreatments')
  update(@Param('id') id: string, @Body() updateDto: UpdateTreatmentDto, @Req() req) {
    return this.treatmentsService.update(id, updateDto, req.user.tenantId);
  }

  @Delete(':id')
  @RequiresSetting('CanManageTreatments')
  remove(@Param('id') id: string, @Req() req) {
    return this.treatmentsService.remove(id, req.user.tenantId);
  }
}