import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // Permite el acceso solo si el usuario existe y tiene la marca de Super Admin
    return user && user.isSuperAdmin;
  }
}