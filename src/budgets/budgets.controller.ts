import { Controller, Get, Post, Body, UseGuards, Req, Param, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post() // <-- Ahora la ruta es POST /budgets
  create(@Body() createBudgetDto: CreateBudgetDto, @Req() req) {
    return this.budgetsService.create(createBudgetDto, req.user.tenantId);
  }

  @Get('patients/:patientId/budgets')
  findAllForPatient(@Param('patientId') patientId: string, @Req() req) {
    return this.budgetsService.findAllForPatient(patientId, req.user.tenantId);
  }

  @Patch('budgets/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveBudget(@Param('id') id: string, @Req() req) {
    return this.budgetsService.updateStatus(id, req.user.tenantId, 'approved');
  }

  @Patch('budgets/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectBudget(@Param('id') id: string, @Req() req) {
    return this.budgetsService.updateStatus(id, req.user.tenantId, 'rejected');
  }

  @Get(':id') // <-- La ruta es GET /budgets/:id
  findOne(@Param('id') id: string, @Req() req) {
    return this.budgetsService.findOne(id, req.user.tenantId);
  }
}