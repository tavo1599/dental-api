import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';

@UseGuards(AuthGuard('jwt'), BranchContextGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @Body() dto: CreateSaleDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.salesService.create(
      dto,
      req.user.tenantId,
      branchId,
      req.user.id ?? req.user.sub,
    );
  }

  @Get()
  findAll(
    @Req() req,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.findAll(req.user.tenantId, branchId, { from, to });
  }

  /**
   * Anula una venta y devuelve el stock.
   *
   * Es PATCH y no DELETE a proposito: la venta no se borra, se marca anulada y
   * sigue en el listado. Borrarla se llevaria por delante el apunte de caja y
   * los movimientos de inventario que la explican.
   */
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.salesService.cancel(
      id,
      req.user.tenantId,
      branchId,
      req.user.id ?? req.user.sub,
      reason,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.salesService.findOne(id, req.user.tenantId, branchId);
  }
}
