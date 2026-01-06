import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../tenants/entities/tenant.entity';
import * as sharp from 'sharp';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/r2.config';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(createUserDto: CreateUserDto, tenantId: string): Promise<User> {
    const tenant = await this.tenantRepository.findOne({ 
      where: { id: tenantId },
      relations: ['users']
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

  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { 
        tenant: { id: tenantId },
        isSuperAdmin: false,
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

  // --- MÉTODOS AUXILIARES AGREGADOS PARA COMPLETAR EL CONTROLADOR ---

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['tenant'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    return this.userRepository.remove(user);
  }

  // ------------------------------------------------------------------

  async update(userId: string, updateUserDto: UpdateUserDto, tenantId: string) {
    // Nota: findOneBy busca por ID y Tenant para seguridad
    const user = await this.userRepository.findOneBy({ id: userId, tenant: { id: tenantId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    
    // Si el DTO trae 'password' y quieres permitir actualizarlo aquí, deberías hashearlo.
    // Si no, la lógica de 'changePassword' separada está bien.
    // Como pediste no cambiar tu código base, dejamos el merge simple:
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

  // =================================================================
  // NUEVA FUNCIONALIDAD: GESTIÓN DE FOTO DE PERFIL (R2)
  // =================================================================

  // Helper privado para subir a R2
  private async uploadToR2(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key, 
      Body: buffer,
      ContentType: mimeType,
    });
    
    await r2Client.send(command);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  async updatePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!file) throw new BadRequestException('No se envió imagen');

    try {
      // 1. Optimizar imagen (Cuadrada 300x300)
      const processedBuffer = await sharp(file.buffer)
        .resize(300, 300, { fit: 'cover' }) 
        .webp({ quality: 80 })
        .toBuffer();

      // 2. Definir ruta única en el bucket
      const fileName = `profile_${Date.now()}.webp`;
      const key = `users/${userId}/${fileName}`;

      // 3. Subir a Cloudflare R2
      const publicUrl = await this.uploadToR2(processedBuffer, key, 'image/webp');

      // 4. Limpieza: Borrar foto antigua si existe en R2
      if (user.photoUrl && user.photoUrl.startsWith(R2_PUBLIC_URL)) {
          try {
             let oldKey = user.photoUrl.replace(R2_PUBLIC_URL, '');
             if (oldKey.startsWith('/')) oldKey = oldKey.substring(1);
             await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: oldKey }));
          } catch (e) { 
             console.warn('No se pudo borrar la foto antigua de R2 (puede que ya no exista):', e); 
          }
      }

      // 5. Guardar nueva URL en BD
      user.photoUrl = publicUrl;
      return this.userRepository.save(user);

    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al procesar o subir la foto de perfil.');
    }
  }
}