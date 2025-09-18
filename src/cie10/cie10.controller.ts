import { Controller, Get, Query, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { Cie10Service } from './cie10.service';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { Cie10CodeDto } from './dto/cie10-code.dto';

@Controller('cie10')
export class Cie10Controller {
  constructor(private readonly cie10Service: Cie10Service) {}

  // Endpoint PÚBLICO para buscar (lo usan todas las clínicas)
  @Get('search')
  @UseGuards(AuthGuard('jwt')) // Requiere estar logueado
  search(@Query('term') term: string) {
    return this.cie10Service.search(term);
  }

  // --- NUEVOS ENDPOINTS (SOLO PARA SUPER ADMIN) ---

  @Post()
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard) // Requiere ser Super Admin
  create(@Body() dto: Cie10CodeDto) {
    return this.cie10Service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard) // Requiere ser Super Admin
  update(@Param('id') id: string, @Body() dto: Cie10CodeDto) {
    return this.cie10Service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), SuperAdminGuard) // Requiere ser Super Admin
  remove(@Param('id') id: string) {
    return this.cie10Service.remove(id);
  }
}