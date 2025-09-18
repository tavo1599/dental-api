import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(AuthGuard('jwt'))
@Controller('budgets/:budgetId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Param('budgetId') budgetId: string,
    @Body() createDto: CreatePaymentDto,
    @Req() req,
  ) {
    const { tenantId, sub: userId } = req.user;
    return this.paymentsService.create(createDto, budgetId, userId, tenantId);
  }

  @Get()
  findAll(@Param('budgetId') budgetId: string, @Req() req) {
    return this.paymentsService.findAllForBudget(budgetId, req.user.tenantId);
  }
}