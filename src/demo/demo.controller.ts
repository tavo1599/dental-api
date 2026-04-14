import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DemoService } from './demo.service';

@Controller('admin/demo-tools')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  // POST -> Llenar datos
// POST -> Llenar datos
  @Post('seed/:tenantId')
  @Roles(UserRole.ADMIN) // <--- CÁMBIALO AQUÍ
  async seedClinic(@Param('tenantId') tenantId: string) {
    return this.demoService.seed(tenantId);
  }

  // DELETE -> Vaciar datos
  @Delete('reset/:tenantId')
  @Roles(UserRole.ADMIN) // <--- Y CÁMBIALO AQUÍ
  async resetClinic(@Param('tenantId') tenantId: string) {
    return this.demoService.reset(tenantId);
  }
}