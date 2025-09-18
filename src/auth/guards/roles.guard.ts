import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtiene los roles requeridos del decorador @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no se especifican roles, permite el acceso
    if (!requiredRoles) {
      return true;
    }

    // 2. Obtiene el usuario de la petición (que fue adjuntado por JwtStrategy)
    const { user } = context.switchToHttp().getRequest();

    // 3. Compara el rol del usuario con los roles requeridos
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}