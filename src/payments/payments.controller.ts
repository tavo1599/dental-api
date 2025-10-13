import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(AuthGuard('jwt'))
@Controller('payments') // <-- RUTA SIMPLIFICADA
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createDto: CreatePaymentDto, @Req() req) {
    const { tenantId, sub: userId } = req.user;
    return this.paymentsService.create(createDto, createDto.budgetId, userId, tenantId);
  }

  @Get('budget/:budgetId')
  findAllForBudget(@Param('budgetId') budgetId: string, @Req() req) {
    return this.paymentsService.findAllForBudget(budgetId, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.paymentsService.findOne(id, req.user.tenantId);
  }
}