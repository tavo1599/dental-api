import { Controller, Get, Param } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('departments')
  getDepartments() {
    return this.locationsService.getDepartments();
  }

  @Get('provinces/:departmentId')
  getProvinces(@Param('departmentId') departmentId: string) {
    return this.locationsService.getProvinces(departmentId);
  }

  @Get('districts/:provinceId')
  getDistricts(@Param('provinceId') provinceId: string) {
    return this.locationsService.getDistricts(provinceId);
  }
}