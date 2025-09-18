import { Controller, Get, Param } from '@nestjs/common';
import { UtilsService } from './utils.service';

@Controller('utils')
export class UtilsController {
  constructor(private readonly utilsService: UtilsService) {}

  @Get('dni/:dni')
  lookupDni(@Param('dni') dni: string) {
    return this.utilsService.lookupDni(dni);
  }
}