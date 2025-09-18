import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
// Este decorador tomará una lista de roles y la guardará como metadatos
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);