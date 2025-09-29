import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant) // <-- Inyectamos el repositorio de Tenant
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: string): Promise<User> {
    const tenant = await this.tenantRepository.findOne({ 
      where: { id: tenantId },
      relations: ['users'] // Cargamos los usuarios existentes para contarlos
    });

    if (tenant.users.length >= tenant.maxUsers) {
      throw new BadRequestException('Ha alcanzado el límite de usuarios para su plan.');
    }
    const { fullName, email, password, role } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      fullName,
      email,
      password_hash: hashedPassword,
      role,
      tenant: { id: tenantId },
    });
    const savedUser = await this.userRepository.save(newUser);
    delete savedUser.password_hash;
    return savedUser;
  }

  // --- MÉTODO 'findAll' CORREGIDO ---
  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { 
        tenant: { id: tenantId },
        isSuperAdmin: false, // <-- LA LÍNEA CLAVE: Excluye a los Super Admins
      },
      select: ['id', 'fullName', 'email', 'role'],
    });
  }

  async findAllDoctors(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        tenant: { id: tenantId },
        role: In([UserRole.DENTIST, UserRole.ADMIN]),
        isSuperAdmin: false,
      },
      select: ['id', 'fullName', 'email', 'role'],
    });
  }

  async update(userId: string, updateUserDto: UpdateUserDto, tenantId: string) {
    const user = await this.userRepository.findOneBy({ id: userId, tenant: { id: tenantId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    const updatedUser = this.userRepository.merge(user, updateUserDto);
    return this.userRepository.save(updatedUser);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.createQueryBuilder("user")
      .addSelect("user.password_hash")
      .where("user.id = :id", { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada con éxito.' };
  }
}