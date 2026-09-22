import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Branch } from '../branches/entities/branch.entity';
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
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
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

    // Una clinica tiene UN solo titular. Si hiciera falta delegar, para eso
    // estan los admins de sucursal (rol BRANCH_ADMIN).
    if (role === UserRole.ADMIN) {
      const yaExiste = await this.userRepository.exists({
        where: { tenant: { id: tenantId }, role: UserRole.ADMIN },
      });
      if (yaExiste) {
        throw new BadRequestException(
          'La clínica ya tiene un administrador. Para delegar la gestión de una sede, asigna un administrador de sucursal.',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      fullName,
      email,
      password_hash: hashedPassword,
      role,
      tenant: { id: tenantId },
    });
    const savedUser = await this.userRepository.save(newUser);

    // Todo usuario nace asignado a la sede principal de su clinica. Sin esto
    // se quedaria sin ninguna sede y no podria ni ver la agenda: el contexto
    // de sede no sabria sobre cual trabaja.
    const mainBranch = await this.branchRepository.findOne({
      where: { tenant: { id: tenantId }, isMain: true },
    });
    if (mainBranch) {
      await this.userRepository
        .createQueryBuilder()
        .relation(User, 'branches')
        .of(savedUser.id)
        .add(mainBranch.id)
        .catch((error: any) => {
          // 23505 = ya estaba asignado, que es el resultado buscado igual.
          const code = error?.driverError?.code ?? error?.code;
          if (code !== '23505') throw error;
        });
    }

    delete savedUser.password_hash;
    return savedUser;
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { 
        tenant: { id: tenantId },
        isSuperAdmin: false,
      },
      // 👇 AÑADIDO 'isActive' PARA EL FRONTEND 👇
      select: ['id', 'fullName', 'email', 'role', 'isActive'],
    });
  }

  async findAllDoctors(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        tenant: { id: tenantId },
        role: In([UserRole.DENTIST, UserRole.ADMIN]),
        isSuperAdmin: false,
      },
      // 👇 AÑADIDO 'isActive' PARA EL FRONTEND 👇
      select: ['id', 'fullName', 'email', 'role', 'isActive'],
    });
  }

  // --- MÉTODOS AUXILIARES AGREGADOS PARA COMPLETAR EL CONTROLADOR ---

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['tenant'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /**
   * Borra un usuario. En la practica casi nunca se puede: en cuanto ha atendido
   * una cita o firmado un presupuesto, su nombre esta en registros clinicos y
   * la base lo protege. Eso es deseable -borrarlo dejaria historias sin autor-,
   * pero hay que explicarlo en vez de devolver un 500.
   *
   * Para dar de baja a alguien que ya no trabaja en la clinica se usa
   * "bloquear acceso" (isActive = false), que conserva su historial.
   */
  async remove(id: string, tenantId: string, currentUserId?: string) {
    // Filtrado por clinica: sin esto, un admin podria borrar al usuario de
    // OTRA clinica con solo conocer su id.
    const user = await this.userRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });
    if (!user) {
      throw new NotFoundException(
        'Usuario no encontrado o no pertenece a esta clínica.',
      );
    }

    if (currentUserId && user.id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario.');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'No se puede eliminar al titular de la clínica. Transfiere la administración a otra persona primero.',
      );
    }

    try {
      return await this.userRepository.remove(user);
    } catch (error: any) {
      // 23503 = foreign_key_violation
      const code = error?.driverError?.code ?? error?.code;
      if (code === '23503') {
        throw new ConflictException(await this.buildInUseMessage(user));
      }
      throw error;
    }
  }

  /** Cuenta en que registros aparece el usuario, para explicar el bloqueo. */
  private async buildInUseMessage(user: User): Promise<string> {
    const [row] = await this.userRepository.query(
      `SELECT
         (SELECT count(*) FROM appointments WHERE "doctorId" = $1)              AS citas,
         (SELECT count(*) FROM budgets WHERE "doctorId" = $1)                   AS presupuestos,
         (SELECT count(*) FROM payments WHERE "registeredById" = $1)            AS pagos,
         (SELECT count(*) FROM clinical_history_entries WHERE "userId" = $1)    AS historial,
         (SELECT count(*) FROM prescriptions WHERE "doctorId" = $1)             AS recetas`,
      [user.id],
    );

    const etiquetas: [string, string, string][] = [
      ['citas', 'cita', 'citas'],
      ['presupuestos', 'presupuesto', 'presupuestos'],
      ['pagos', 'pago registrado', 'pagos registrados'],
      ['historial', 'entrada de historial clínico', 'entradas de historial clínico'],
      ['recetas', 'receta', 'recetas'],
    ];

    const partes = etiquetas
      .map(([campo, singular, plural]) => {
        const n = Number(row?.[campo] ?? 0);
        return n > 0 ? `${n} ${n === 1 ? singular : plural}` : null;
      })
      .filter(Boolean);

    const detalle = partes.length
      ? ` Tiene ${partes.join(', ')}.`
      : '';

    return (
      `No se puede eliminar a ${user.fullName} porque su nombre figura en registros clínicos.${detalle} ` +
      'Si ya no trabaja en la clínica, usa "Bloquear acceso": no podrá entrar y su historial se conserva.'
    );
  }

  // ------------------------------------------------------------------

  async update(userId: string, updateUserDto: UpdateUserDto, tenantId: string) {
    // Nota: findOneBy busca por ID y Tenant para seguridad
    const user = await this.userRepository.findOneBy({ id: userId, tenant: { id: tenantId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    
    // La titularidad NO se cambia editando un usuario. Sin esto, un admin podia
    // editar a cualquier doctor y ponerle role='admin', saltandose la
    // validacion de "un solo admin por clinica" que si cubre la creacion.
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      if (updateUserDto.role === UserRole.ADMIN) {
        throw new BadRequestException(
          'La titularidad de la clínica no se cambia editando un usuario. Usa la transferencia de administrador.',
        );
      }
      if (user.role === UserRole.ADMIN) {
        throw new BadRequestException(
          'No se puede quitar el rol al titular de la clínica: se quedaría sin administrador. Transfiere la titularidad a otro usuario primero.',
        );
      }
      if (updateUserDto.role === UserRole.BRANCH_ADMIN) {
        throw new BadRequestException(
          'El administrador de sucursal se asigna desde la sede correspondiente, no editando el usuario.',
        );
      }
    }

    // Si el DTO trae 'password' y quieres permitir actualizarlo aquí, deberías hashearlo.
    // Si no, la lógica de 'changePassword' separada está bien.
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

  // =================================================================
  // 👇 NUEVO: CONTROL DE ACCESO (HABILITAR/INHABILITAR) 👇
  // =================================================================

  async updateAccessStatus(userId: string, tenantId: string, isActive: boolean) {
    // Buscamos asegurando que el usuario pertenezca a la clínica de quien lo solicita
    const user = await this.userRepository.findOne({
      where: { id: userId, tenant: { id: tenantId } }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado en su clínica.');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    const accion = isActive ? 'restaurado' : 'revocado';
    return { message: `El acceso del usuario ha sido ${accion} con éxito.` };
  }
}