import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: string): Promise<User> {
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
}