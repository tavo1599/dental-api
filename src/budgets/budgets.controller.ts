import { Controller, Get, Post, Body, UseGuards, Req, Param, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { UserRole } from '../users/entities/user.entity';
import { BudgetStatus } from './entities/budget.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(@Body() createBudgetDto: CreateBudgetDto, @Req() req) {
    const { tenantId, sub: doctorId } = req.user;
    return this.budgetsService.create(createBudgetDto, tenantId, doctorId);
  }

  // --- ENDPOINT CORREGIDO Y FINAL ---
  @Get('patient/:patientId')
  findAllForPatient(
    @Param('patientId') patientId: string,
    @Req() req,
    @Query('doctorId') doctorIdFromQuery?: string, // Lee el filtro del frontend
  ) {
    const { tenantId, role, sub: userId } = req.user;

    // Si el usuario es un doctor, SIEMPRE usa su propio ID y ignora cualquier otro filtro.
    if (role === UserRole.DENTIST) {
      return this.budgetsService.findAllForPatient(patientId, tenantId, userId);
    }
    
    // Si es admin o asistente, usa el filtro que viene de la URL (o ninguno si es 'all').
    return this.budgetsService.findAllForPatient(patientId, tenantId, doctorIdFromQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.budgetsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approveBudget(@Param('id') id: string, @Req() req) {
    return this.budgetsService.updateStatus(id, req.user.tenantId, BudgetStatus.APPROVED);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  rejectBudget(@Param('id') id: string, @Req() req) {
    return this.budgetsService.updateStatus(id, req.user.tenantId, BudgetStatus.REJECTED);
  }

  @Patch(':id/discount')
  @HttpCode(HttpStatus.OK)
  setDiscount(@Param('id') id: string, @Body() body: UpdateDiscountDto, @Req() req) {
    // Permite establecer o actualizar un descuento (monto fijo) para un presupuesto
    return this.budgetsService.updateDiscount(id, req.user.tenantId, body.discountAmount);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req) {
    // Elimina un presupuesto asegurando que pertenece al tenant del usuario
    return this.budgetsService.remove(id, req.user.tenantId);
  }
}