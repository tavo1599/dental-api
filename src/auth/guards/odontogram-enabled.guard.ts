import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { usesOdontogram } from '../../tenants/specialty';

/**
 * ============================================================================
 * ODONTOGRAMA SOLO PARA CLINICAS DENTALES
 *
 * Esconder las pestanas en la interfaz no basta: los endpoints seguirian
 * aceptando la peticion y bastaria llamarlos a mano. Es el mismo fallo que
 * tenian los permisos de systemSettings, y no se repite.
 *
 * Aqui no hay nada configurable ni ningun caso en que un psicologo deba poder
 * abrir un odontograma: o la clinica es dental o no lo es.
 * ============================================================================
 */
@Injectable()
export class OdontogramEnabledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // El super admin entra a cualquier clinica cuando se personifica a alguien;
    // en ese caso manda el rubro de la clinica, no el suyo.
    if (usesOdontogram(user.specialty)) return true;

    throw new ForbiddenException(
      'El odontograma no está disponible para este tipo de consultorio.',
    );
  }
}
