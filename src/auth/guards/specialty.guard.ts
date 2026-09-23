import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClinicSpecialty, SPECIALTY_LABELS } from '../../tenants/specialty';
import { SPECIALTY_KEY } from '../decorators/requires-specialty.decorator';

/**
 * ============================================================================
 * RUTAS PROPIAS DE UN RUBRO
 *
 * Esconder una pestana en la interfaz no basta: el endpoint seguiria
 * aceptando la peticion y bastaria con llamarlo a mano. Es el mismo fallo que
 * tenian los permisos de systemSettings, y no se repite.
 *
 * El rubro viaja en request.user (lo adjunta JwtStrategy, que ya carga el
 * tenant), asi que esto no anade ninguna consulta.
 *
 * Sin valor se asume dental: una clinica anterior a que existiera el campo
 * lo era, y asi el odontograma les sigue funcionando.
 * ============================================================================
 */
@Injectable()
export class SpecialtyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<ClinicSpecialty[]>(
      SPECIALTY_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin @RequiresSpecialty no hay nada que comprobar.
    if (!permitidos?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const rubro: ClinicSpecialty = user.specialty ?? ClinicSpecialty.DENTAL;
    if (permitidos.includes(rubro)) return true;

    const nombres = permitidos.map((r) => SPECIALTY_LABELS[r]).join(' o ');
    throw new ForbiddenException(
      `Esta sección es de ${nombres} y tu consultorio está registrado como ${SPECIALTY_LABELS[rubro]}.`,
    );
  }
}
