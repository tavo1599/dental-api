import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { BranchContextGuard } from '../auth/guards/branch-context.guard';
import { CurrentBranch } from '../auth/decorators/current-branch.decorator';

@UseGuards(AuthGuard('jwt'), BranchContextGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.expensesService.create(createExpenseDto, req.user.tenantId, branchId);
  }

  @Get()
  findAll(@Req() req, @CurrentBranch() branchId: string | null) {
    return this.expensesService.findAll(req.user.tenantId, branchId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.expensesService.update(id, updateExpenseDto, req.user.tenantId, branchId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.expensesService.remove(id, req.user.tenantId, branchId);
  }
}