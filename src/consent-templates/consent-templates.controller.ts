import { Controller, Get, UseGuards, Param, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConsentTemplatesService } from './consent-templates.service';

@Controller('consent-templates')
export class ConsentTemplatesController {
  constructor(private readonly templatesService: ConsentTemplatesService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':templateId/generate/:patientId')
  @UseGuards(AuthGuard('jwt'))
  generate(
    @Param('templateId') templateId: string,
    @Param('patientId') patientId: string,
    @Req() req,
  ) {
    return this.templatesService.generate(templateId, patientId, req.user);
  }
}