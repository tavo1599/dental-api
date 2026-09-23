import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
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
import { ClinicSpecialty } from '../tenants/specialty';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Convierte el nombre de la clinica en un identificador seguro para la columna
   * 'schema' (que es UNIQUE): quita tildes y la enye, colapsa todo lo que no sea
   * alfanumerico en '_' y, si ya existe, agrega un sufijo corto unico.
   */
  private async generateUniqueSchema(clinicName: string): Promise<string> {
    const base =
      clinicName
        .normalize('NFD')                 // separa cada letra de su tilde
        .replace(/[\u0300-\u036f]/g, '') // quita las tildes (ñ -> n)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')      // cualquier otra cosa -> guion bajo
        .replace(/^_+|_+$/g, '')          // sin guiones al principio/final
        .slice(0, 40) || 'clinica';

    const exists = await this.tenantRepository.findOne({
      where: { schema: base },
      select: { id: true },
    });
    if (!exists) {
      return base;
    }
    return `${base}_${crypto.randomUUID().slice(0, 8)}`;
  }

  async register(registerDto: RegisterAuthDto) {
    const { clinicName, clinicPhone, clinicEmail, clinicAddress, email, fullName, password, phone } = registerDto;

    // Mensaje claro en vez de dejar que reviente como 500 por el indice UNIQUE.
    const existingUser = await this.userRepository.findOne({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta registrada con este email.');
    }

    const schema = await this.generateUniqueSchema(clinicName);
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Transaccion: si falla la creacion del User, el Tenant tampoco se persiste.
      return await this.dataSource.transaction(async (manager) => {
        const newTenant = manager.create(Tenant, {
          name: clinicName,
          schema,
          phone: clinicPhone,
          email: clinicEmail,
          address: clinicAddress,
          plan: 'profesional',
          maxUsers: 10,
          specialty: registerDto.specialty ?? ClinicSpecialty.DENTAL,
        });
        await manager.save(newTenant);

        // TODA clinica nace con su sede principal, use sucursales o no.
        // Sin ella no podria registrar ni una cita: branchId es obligatorio en
        // citas, presupuestos, pagos y gastos. Si el modulo de sucursales esta
        // apagado la clinica ni se entera de que existe: trabaja siempre sobre
        // esta sede.
        const mainBranch = manager.create(Branch, {
          name: 'Sede Principal',
          isMain: true,
          isActive: true,
          address: clinicAddress ?? null,
          phone: clinicPhone ?? null,
          email: clinicEmail ?? null,
          tenant: newTenant,
        });
        await manager.save(mainBranch);

        const newUser = manager.create(User, {
          email,
          fullName: fullName,
          password_hash: hashedPassword,
          role: UserRole.ADMIN,
          tenant: newTenant,
          phone: phone,
          // El titular trabaja en la sede principal desde el primer momento.
          branches: [mainBranch],
        });
        await manager.save(newUser);

        delete newUser.password_hash;
        return newUser;
      });
    } catch (error) {
      // 23505 = unique_violation. Cubre la carrera entre dos registros simultaneos
      // que el chequeo previo no puede evitar.
      const code = error?.driverError?.code ?? error?.code;
      if (code === '23505') {
        throw new ConflictException('Ya existe una cuenta o clínica registrada con esos datos.');
      }
      console.error(error);
      throw new InternalServerErrorException('Error creating account');
    }
  }

  async login(loginDto: LoginAuthDto) {
    // 👇 MODIFICADO: Extraemos rememberMe del DTO 👇
    const { email, password, rememberMe } = loginDto;
    
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.password_hash')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.email = :email', { email })
      .getOne();
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Tu acceso al sistema ha sido revocado. Contacta al administrador.');
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

    // 👇 MODIFICADO: Pasamos el flag al generador de tokens 👇
    return this.generateTokenForUser(user, rememberMe);
  }
  
  // 👇 MODIFICADO: Recibe el parámetro booleano con un valor por defecto false 👇
  generateTokenForUser(user: User, rememberMe: boolean = false) {
    const tenant = user.tenant;
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      isSuperAdmin: user.isSuperAdmin,
      tenantId: tenant?.id,
      tenantName: tenant?.name,
      // LISTA BLANCA EXPLICITA. Un JWT es base64, no esta cifrado: cualquiera que
      // tenga el token puede leer este objeto. Nunca agregar aqui credenciales,
      // tokens de terceros ni ningun otro secreto.
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            logoUrl: tenant.logoUrl,
            address: tenant.address,
            phone: tenant.phone,
            email: tenant.email,
            plan: tenant.plan,
            status: tenant.status,
            domainSlug: tenant.domainSlug,
            // Modulo de sucursales: lo activa el super admin, no la clinica.
            branchesEnabled: tenant.branchesEnabled,
            systemSettings: tenant.systemSettings,
            websiteConfig: tenant.websiteConfig,
          }
        : null,
    };

    return {
      // 👇 CONFIGURACIÓN DINÁMICA DE EXPIRACIÓN 👇
      access_token: this.jwtService.sign(payload, {
        expiresIn: rememberMe ? '30d' : '2h', // 30 días si marca el check, 2 horas si no.
      }),
    };
  }

  async findUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    delete user.password_hash; 
    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOneBy({ email });

    if (!user) {
      return { message: 'Si existe una cuenta con este email, se ha enviado un enlace de recuperación.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expirationDate;

    await this.userRepository.save(user);

    await this.mailService.sendPasswordResetEmail(user, rawToken);
    
    return { message: 'Si existe una cuenta con este email, se ha enviado un enlace de recuperación.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.createQueryBuilder('user')
      .where('user.resetPasswordToken = :token', { token: hashedToken })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();
      
    if (!user) {
      throw new BadRequestException('El token es inválido o ha expirado.');
    }

    user.password_hash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada con éxito.' };
  }

  async getFullUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    delete user.password_hash;
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;

    await this.userRepository.save(user);

    delete user.password_hash;
    return user;
  }
}