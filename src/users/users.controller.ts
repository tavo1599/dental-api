import { Body, Controller, Get, Param, Patch, Post, Delete, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- 1. RUTAS ESPECÍFICAS (Deben ir primero para no chocar con :id) ---

  @Patch('change-password')
  changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user.id || req.user.sub;
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  // NUEVO: Subir foto de perfil (Cualquier usuario logueado puede subir su propia foto)
  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(@Req() req, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.id || req.user.sub;
    return this.usersService.updatePhoto(userId, file);
  }

  // NUEVO: Obtener mi propio perfil
  @Get('me')
  getProfile(@Req() req) {
    const userId = req.user.id || req.user.sub;
    return this.usersService.findOne(userId);
  }

  // EXISTENTE: Listar solo doctores (Lo movemos arriba de :id por seguridad)
  @Get('doctors')
  findAllDoctors(@Req() req) {
    return this.usersService.findAllDoctors(req.user.tenantId);
  }

  // --- 2. RUTAS GENÉRICAS / PARAMETRIZADAS ---

  @Get()
  findAll(@Req() req) {
    return this.usersService.findAll(req.user.tenantId);
  }

  // NUEVO: Obtener usuario por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // MODIFICADO: Permitir que el usuario se edite a sí mismo (para completar perfil)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    // Seguridad: Solo Admin o el mismo usuario puede editarse
    const userId = req.user.id || req.user.sub;
    if (req.user.role !== UserRole.ADMIN && userId !== id) {
        throw new Error('No tienes permiso para editar este usuario');
    }
    return this.usersService.update(id, updateUserDto, req.user.tenantId);
  }

  // EXISTENTE: Crear usuario (Solo Admin)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.usersService.create(createUserDto, req.user.tenantId);
  }

  // NUEVO: Eliminar usuario (Solo Admin)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}