import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../auth/decorators/roles.decorator'; // 1. Importa el decorador
import { RolesGuard } from '../auth/guards/roles.guard';   // 2. Importa la guarda
import { UserRole } from './entities/user.entity';         // 3. Importa los roles

@UseGuards(AuthGuard('jwt')) // Todas las rutas requieren un token válido
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Endpoint para CREAR usuario (solo para Admins) ---
  @Post()
  @Roles(UserRole.ADMIN) // 4. Especifica que solo el rol ADMIN tiene acceso
  @UseGuards(RolesGuard)   // 5. Aplica la guarda de roles
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.usersService.create(createUserDto, req.user.tenantId);
  }

  // --- Endpoint para ACTUALIZAR usuario (solo para Admins) ---
  @Patch(':id')
  @Roles(UserRole.ADMIN) // Solo el admin puede cambiar datos de otros
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    return this.usersService.update(id, updateUserDto, req.user.tenantId);
  }
  
  // --- Endpoints para LEER datos (disponibles para todos los usuarios logueados) ---
  @Get()
  findAll(@Req() req) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get('doctors')
  findAllDoctors(@Req() req) {
    return this.usersService.findAllDoctors(req.user.tenantId);
  }
}