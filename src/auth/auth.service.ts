import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterAuthDto } from './dto/register-auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { NotFoundException } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterAuthDto) {
    const { clinicName, email, fullName, password, phone } = registerDto;
    try {
      const newTenant = this.tenantRepository.create({
        name: clinicName,
        schema: clinicName.toLowerCase().replace(/\s+/g, '_'),
        plan: 'profesional', // Plan por defecto
        maxUsers: 10,         // Límite del plan profesional
      });
      await this.tenantRepository.save(newTenant);

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = this.userRepository.create({
        email,
        fullName: fullName,
        password_hash: hashedPassword,
        role: UserRole.ADMIN,
        tenant: newTenant,
        phone: phone,
      });
      await this.userRepository.save(newUser);

      delete newUser.password_hash;
      return newUser;
      
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error creating account');
    }
  }

  async login(loginDto: LoginAuthDto) {
    const { email, password } = loginDto;
    
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.password_hash')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.email = :email', { email })
      .getOne();
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isSuperAdmin && user.tenant) {
      if (user.tenant.status === TenantStatus.INACTIVE) {
        throw new UnauthorizedException('La cuenta de esta clínica ha sido desactivada.');
      }
      if (user.tenant.status === TenantStatus.SUSPENDED) {
        throw new UnauthorizedException('El acceso para esta clínica ha sido suspendido. Por favor, contacte al soporte.');
      }
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.generateTokenForUser(user);
  }
  
generateTokenForUser(user: User) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    isSuperAdmin: user.isSuperAdmin,
    tenantId: user.tenant?.id,
    tenantName: user.tenant?.name,
    tenant: user.tenant,
  };

  return {
    access_token: this.jwtService.sign(payload),
  };
}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOneBy({ email });

    // Por seguridad, no revelamos si el usuario no existe.
    if (!user) {
      return { message: 'Si existe una cuenta con este email, se ha enviado un enlace de recuperación.' };
    }

    // Genera un token aleatorio
    const rawToken = crypto.randomBytes(32).toString('hex');
    // Hashea el token antes de guardarlo en la BD
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    // Establece la fecha de expiración (ej. 1 hora)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expirationDate;

    await this.userRepository.save(user);

    // Envía el correo usando el MailService (con el token SIN hashear)
    await this.mailService.sendPasswordResetEmail(user, rawToken);
    
    return { message: 'Si existe una cuenta con este email, se ha enviado un enlace de recuperación.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Hashea el token recibido para compararlo con el de la BD
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Busca al usuario por el token hasheado y que no haya expirado
    const user = await this.userRepository.createQueryBuilder('user')
      .where('user.resetPasswordToken = :token', { token: hashedToken })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();
      
    if (!user) {
      throw new BadRequestException('El token es inválido o ha expirado.');
    }

    // Actualiza la contraseña
    user.password_hash = await bcrypt.hash(password, 10);
    // Limpia los campos del token para que no se pueda reutilizar
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada con éxito.' };
  }

  async getFullUserProfile(userId: string) {
    // Busca el usuario en la base de datos y carga su relación con tenant
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    // No enviamos la contraseña
    delete user.password_hash;
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
  const user = await this.userRepository.findOneBy({ id: userId });
  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }

  // Actualiza solo los campos que vienen en el DTO
  if (dto.fullName) user.fullName = dto.fullName;
  if (dto.phone) user.phone = dto.phone;

  await this.userRepository.save(user);

  // No devolvemos la contraseña
  delete user.password_hash;
  return user;
}
  
}
