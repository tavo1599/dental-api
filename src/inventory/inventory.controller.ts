import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(AuthGuard('jwt'), BranchContextGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // --- Catalogo ---

  @Get('products')
  findAll(
    @Req() req,
    @CurrentBranch() branchId: string | null,
    @Query('sellable') sellable?: string,
    @Query('consumable') consumable?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.findAll(req.user.tenantId, branchId, {
      onlySellable: sellable === 'true',
      onlyConsumable: consumable === 'true',
      search,
    });
  }

  @Get('products/low-stock')
  findLowStock(@Req() req, @CurrentBranch() branchId: string | null) {
    return this.inventoryService.findLowStock(req.user.tenantId, branchId);
  }

  /**
   * Lotes vencidos o por vencer. `days` controla la antelacion del aviso.
   */
  @Get('expiring')
  findExpiring(
    @Req() req,
    @CurrentBranch() branchId: string | null,
    @Query('days') days?: string,
  ) {
    const dias = Number(days);
    return this.inventoryService.findExpiring(
      req.user.tenantId,
      branchId,
      Number.isFinite(dias) && dias > 0 ? dias : 60,
    );
  }

  @Get('products/:id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.inventoryService.findOne(id, req.user.tenantId);
  }

  @Get('products/:id/lots')
  findLots(
    @Param('id') productId: string,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.inventoryService.findLots(productId, req.user.tenantId, branchId);
  }

  @Post('products')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateProductDto, @Req() req) {
    return this.inventoryService.create(dto, req.user.tenantId);
  }

  @Patch('products/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req) {
    return this.inventoryService.update(id, dto, req.user.tenantId);
  }

  /** Desactiva el producto; nunca se borra, para no romper el kardex. */
  @Delete('products/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  deactivate(@Param('id') id: string, @Req() req) {
    return this.inventoryService.deactivate(id, req.user.tenantId);
  }

  // --- Kardex ---

  @Post('movements')
  registerMovement(
    @Body() dto: CreateMovementDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.inventoryService.registerMovement(
      dto,
      req.user.tenantId,
      branchId,
      req.user.id ?? req.user.sub,
    );
  }

  @Get('products/:id/movements')
  findMovements(
    @Param('id') productId: string,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.inventoryService.findMovements(
      productId,
      req.user.tenantId,
      branchId,
    );
  }
}
