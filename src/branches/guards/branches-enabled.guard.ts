import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Exige que la clinica tenga contratado el modulo de sucursales.
 *
 * Sin esto bastaria con llamar a la API directamente para crearse sedes, aunque
 * la interfaz no las muestre: ocultar botones no es un control de acceso.
 *
 * El super admin queda exento: es quien lo activa.
 */
@Injectable()
export class BranchesEnabledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user) return true;
    if (user.isSuperAdmin === true) return true;

    if (user.branchesEnabled !== true) {
      throw new ForbiddenException(
        'El módulo de sucursales no está activo para esta clínica. Contacta a soporte para habilitarlo.',
      );
    }
    return true;
  }
}
