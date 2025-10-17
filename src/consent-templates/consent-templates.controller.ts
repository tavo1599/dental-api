import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConsentTemplatesService } from './consent-templates.service';
import { CreateConsentTemplateDto } from './dto/create-consent-template.dto';
import { UpdateConsentTemplateDto } from './dto/update-consent-template.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('consent-templates')
export class ConsentTemplatesController {
  constructor(private readonly consentTemplatesService: ConsentTemplatesService) {}

  @Get()
  findAll(@Req() req) {
    return this.consentTemplatesService.findAll(req.user.tenantId);
  }

  @Post('generate')
  generate(@Body() body: { templateId: string; patientId: string }, @Req() req) {
    return this.consentTemplatesService.generate(body.templateId, body.patientId, req.user);
  }

  // --- RUTA 'create' CORREGIDA ---
  // Ahora responde a POST /consent-templates/clinic-template para ser único
  @Post('clinic-template')
  create(@Body() createDto: CreateConsentTemplateDto, @Req() req) {
    // req.user.tenantId será 'null' para Super Admin y un ID para Admin de clínica
    return this.consentTemplatesService.create(createDto, req.user.tenantId);
  }
  // --- FIN DE LA CORRECCIÓN ---

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateConsentTemplateDto, @Req() req) {
    return this.consentTemplatesService.update(id, updateDto, req.user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    return this.consentTemplatesService.remove(id, req.user.tenantId);
  }
}