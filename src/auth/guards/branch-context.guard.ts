import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { UserRole } from '../../users/entities/user.entity';

/**
 * ============================================================================
 * CONTEXTO DE SEDE
 *
 * Resuelve sobre QUE sede trabaja esta peticion y lo deja en `req.branchId`.
 * La sede viaja en la cabecera `X-Branch-Id` (no en el JWT) para que cambiar
 * de sucursal en la interfaz no obligue a reemitir el token.
 *
 * Reglas:
 *  - Sin cabecera + admin        -> req.branchId = null  (TODAS las sedes:
 *                                   es como se ven las estadisticas juntas)
 *  - Sin cabecera + una sola sede-> esa sede
 *  - Sin cabecera + varias sedes -> 400, tiene que elegir
 *  - Con cabecera                -> se valida el acceso
 *
 * SEGURIDAD: que un admin pueda ver "todas sus sedes" no significa que pueda
 * pedir la sede de OTRA clinica. Por eso, cuando el acceso no viene de su lista
 * de sedes asignadas, se comprueba contra la base que la sede sea de su tenant.
 * ============================================================================
 */
@Injectable()
export class BranchContextGuard implements CanActivate {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Sin usuario no hay nada que resolver: de la autenticacion se encarga
    // AuthGuard('jwt'), que corre antes.
    if (!user) return true;

    // OJO: solo el titular de la clinica (ADMIN) ve todas las sedes.
    // El BRANCH_ADMIN administra SU sucursal y nada mas: si entrara aqui,
    // veria la caja y los pacientes de las demas sedes.
    const canSeeAllBranches =
      user.isSuperAdmin === true || user.role === UserRole.ADMIN;
    const assigned: string[] = user.branchIds ?? [];
    const requested = request.headers['x-branch-id'] as string | undefined;

    if (!requested) {
      if (canSeeAllBranches) {
        request.branchId = null; // consolidado
        return true;
      }
      if (assigned.length === 1) {
        request.branchId = assigned[0];
        return true;
      }
      if (assigned.length === 0) {
        throw new ForbiddenException(
          'Tu usuario no tiene ninguna sede asignada. Contacta al administrador.',
        );
      }
      throw new BadRequestException(
        'Debes indicar la sede sobre la que trabajas (cabecera X-Branch-Id).',
      );
    }

    // Camino rapido: es una de sus sedes asignadas, no hace falta consultar.
    if (assigned.includes(requested)) {
      request.branchId = requested;
      return true;
    }

    // Un admin puede entrar a cualquier sede DE SU CLINICA, nunca de otra.
    if (canSeeAllBranches) {
      const belongs = await this.branchRepository.exists({
        where: { id: requested, tenant: { id: user.tenantId } },
      });
      if (belongs) {
        request.branchId = requested;
        return true;
      }
    }

    throw new ForbiddenException('No tienes acceso a esta sede.');
  }
}
