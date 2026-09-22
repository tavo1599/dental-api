import {
  Body,
  Controller,
  Get,
  Param,
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

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.salesService.findOne(id, req.user.tenantId, branchId);
  }
}
