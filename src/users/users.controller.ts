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

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(@Req() req, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.id || req.user.sub;
    return this.usersService.updatePhoto(userId, file);
  }

  @Get('me')
  getProfile(@Req() req) {
    const userId = req.user.id || req.user.sub;
    return this.usersService.findOne(userId);
  }

  @Get('doctors')
  findAllDoctors(@Req() req) {
    return this.usersService.findAllDoctors(req.user.tenantId);
  }

  // --- 2. RUTAS GENÉRICAS / PARAMETRIZADAS ---

  @Get()
  findAll(@Req() req) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    const userId = req.user.id || req.user.sub;
    if (req.user.role !== UserRole.ADMIN && userId !== id) {
        throw new Error('No tienes permiso para editar este usuario');
    }
    return this.usersService.update(id, updateUserDto, req.user.tenantId);
  }

  // 👇 NUEVO: Endpoint para bloquear/permitir acceso al sistema (Solo Admin) 👇
  @Patch(':id/access')
  @Roles(UserRole.ADMIN)
  updateAccessStatus(
    @Param('id') id: string, 
    @Body('isActive') isActive: boolean, 
    @Req() req
  ) {
    return this.usersService.updateAccessStatus(id, req.user.tenantId, isActive);
  }
  // 👆 ====================================================================== 👆

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.usersService.create(createUserDto, req.user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}