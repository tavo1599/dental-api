import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { BranchesEnabledGuard } from './guards/branches-enabled.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /**
   * Alimenta el selector de sede de la interfaz. Lo puede llamar cualquier
   * usuario autenticado: cada quien recibe solo las sedes que le corresponden.
   */
  @Get('available')
  findAvailable(@Req() req) {
    return this.branchesService.findAvailableFor(req.user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  findAll(@Req() req) {
    return this.branchesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  findOne(@Param('id') id: string, @Req() req) {
    return this.branchesService.findOne(id, req.user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  create(@Body() dto: CreateBranchDto, @Req() req) {
    return this.branchesService.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @Req() req) {
    return this.branchesService.update(id, dto, req.user.tenantId);
  }

  /** Desactiva (no borra) la sede. */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  deactivate(@Param('id') id: string, @Req() req) {
    return this.branchesService.deactivate(id, req.user.tenantId);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  activate(@Param('id') id: string, @Req() req) {
    return this.branchesService.activate(id, req.user.tenantId);
  }

  /**
   * Asigna el admin de la sucursal. Solo el titular de la clinica puede
   * hacerlo: si pudiera un admin de sede, podria nombrarse a si mismo en otra.
   */
  @Patch(':id/admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  assignAdmin(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Req() req,
  ) {
    return this.branchesService.assignAdmin(id, userId, req.user.tenantId);
  }

  @Delete(':id/admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard, BranchesEnabledGuard)
  removeAdmin(@Param('id') id: string, @Req() req) {
    return this.branchesService.removeAdmin(id, req.user.tenantId);
  }
}
