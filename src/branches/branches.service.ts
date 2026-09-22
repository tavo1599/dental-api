import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Todas las sedes de la clinica (para el admin). */
  findAll(tenantId: string) {
    return this.branchRepository.find({
      where: { tenant: { id: tenantId } },
      relations: ['admin'],
      order: { isMain: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Sedes que puede usar quien hace la peticion: es lo que alimenta el selector
   * de sede de la interfaz. El admin ve todas las de su clinica; un doctor o
   * asistente, solo aquellas en las que trabaja.
   */
  async findAvailableFor(user: {
    tenantId: string;
    role: UserRole;
    isSuperAdmin?: boolean;
    branchIds?: string[];
  }) {
    if (user.isSuperAdmin || user.role === UserRole.ADMIN) {
      return this.branchRepository.find({
        where: { tenant: { id: user.tenantId }, isActive: true },
        order: { isMain: 'DESC', name: 'ASC' },
      });
    }

    const ids = user.branchIds ?? [];
    if (ids.length === 0) return [];

    return this.branchRepository.find({
      where: { id: In(ids), tenant: { id: user.tenantId }, isActive: true },
      order: { isMain: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const branch = await this.branchRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['users', 'admin'],
    });
    if (!branch) {
      throw new NotFoundException('Sede no encontrada o no pertenece a esta clínica.');
    }
    return branch;
  }

  async create(dto: CreateBranchDto, tenantId: string) {
    const { userIds, ...data } = dto;

    const branch = this.branchRepository.create({
      ...data,
      tenant: { id: tenantId } as Tenant,
      // La sede principal es la que creo el registro de la clinica; una sede
      // nueva nunca nace como principal.
      isMain: false,
      isActive: true,
    });

    if (userIds?.length) {
      branch.users = await this.resolveUsers(userIds, tenantId);
    }

    return this.branchRepository.save(branch);
  }

  async update(id: string, dto: UpdateBranchDto, tenantId: string) {
    const branch = await this.findOne(id, tenantId);
    const { userIds, ...data } = dto;

    Object.assign(branch, data);
    if (userIds) {
      branch.users = await this.resolveUsers(userIds, tenantId);
    }

    return this.branchRepository.save(branch);
  }

  /**
   * Las sedes NO se borran: se desactivan. Borrarlas arrastraria citas,
   * presupuestos y caja historicos. Desactivada deja de aparecer para operar
   * pero su historico sigue intacto.
   */
  async deactivate(id: string, tenantId: string) {
    const branch = await this.findOne(id, tenantId);

    if (branch.isMain) {
      throw new BadRequestException('No se puede desactivar la sede principal.');
    }

    const activas = await this.branchRepository.count({
      where: { tenant: { id: tenantId }, isActive: true },
    });
    if (activas <= 1) {
      throw new BadRequestException('La clínica debe tener al menos una sede activa.');
    }

    branch.isActive = false;
    await this.branchRepository.save(branch);
    return { message: `Sede "${branch.name}" desactivada.` };
  }

  async activate(id: string, tenantId: string) {
    const branch = await this.findOne(id, tenantId);
    branch.isActive = true;
    await this.branchRepository.save(branch);
    return { message: `Sede "${branch.name}" activada.` };
  }

  /**
   * Asigna el admin de una sucursal. Solo uno por sede: al ser una sola
   * columna en `branches`, asignar a otro reemplaza al anterior por
   * construccion, sin validaciones que se puedan olvidar.
   *
   * El usuario debe ser de esta clinica y tener rol BRANCH_ADMIN. Si quien se
   * asigna es un DENTIST o ASSISTANT, se le promueve; nunca se toca a un
   * ADMIN de clinica, para no degradar al titular sin querer.
   */
  async assignAdmin(branchId: string, userId: string, tenantId: string) {
    // OJO: se carga SIN la relacion 'users'. Si se cargara y luego se hiciera
    // save(branch), TypeORM sincronizaria la tabla intermedia con esa lista ya
    // obsoleta y borraria la asignacion que se acaba de crear mas abajo.
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, tenant: { id: tenantId } },
    });
    if (!branch) {
      throw new NotFoundException(
        'Sede no encontrada o no pertenece a esta clínica.',
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, tenant: { id: tenantId } },
    });
    if (!user) {
      throw new BadRequestException(
        'El usuario no existe o no pertenece a esta clínica.',
      );
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'El administrador de la clínica no puede ser admin de una sucursal: ya tiene acceso a todas.',
      );
    }

    if (user.role !== UserRole.BRANCH_ADMIN) {
      user.role = UserRole.BRANCH_ADMIN;
      await this.userRepository.save(user);
    }

    // El admin de la sede trabaja en ella: se asegura la asignacion.
    // Se usa la API de relaciones en vez de save(): manipular la tabla
    // intermedia con save() sobre la entidad no siempre persiste el cambio.
    await this.userRepository
      .createQueryBuilder()
      .relation(User, 'branches')
      .of(userId)
      .add(branchId)
      .catch((error: any) => {
        // 23505 = ya estaba asignado; es el resultado que buscabamos igual.
        const code = error?.driverError?.code ?? error?.code;
        if (code !== '23505') throw error;
      });

    // update() en vez de save(): toca solo la columna adminId y no intenta
    // sincronizar ninguna relacion.
    await this.branchRepository.update(branch.id, { admin: { id: userId } as User });

    return { message: `${user.fullName} es ahora admin de "${branch.name}".` };
  }

  async removeAdmin(branchId: string, tenantId: string) {
    const branch = await this.findOne(branchId, tenantId);
    await this.branchRepository.update(branch.id, { admin: null });
    return { message: `La sede "${branch.name}" quedó sin administrador.` };
  }

  /** Solo usuarios de esta misma clinica pueden asignarse a sus sedes. */
  private async resolveUsers(userIds: string[], tenantId: string) {
    const users = await this.userRepository.find({
      where: { id: In(userIds), tenant: { id: tenantId } },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException(
        'Alguno de los usuarios no existe o no pertenece a esta clínica.',
      );
    }
    return users;
  }
}
