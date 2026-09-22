import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SETTING_KEY,
  SettingSuffix,
} from '../decorators/requires-setting.decorator';
import { isSettingAllowed } from '../settings-permission';

/** Como se llama cada permiso al explicarselo a quien se queda fuera. */
const NOMBRES: Record<SettingSuffix, string> = {
  CanSeePrices: 'ver los precios',
  CanManageBudgets: 'gestionar presupuestos',
  CanSeeReports: 'ver los reportes',
  CanManageTreatments: 'gestionar el catálogo de tratamientos',
  CanSeeDashboardStats: 'ver las estadísticas del panel',
};

/**
 * ============================================================================
 * PERMISOS CONFIGURABLES POR LA CLINICA
 *
 * Hace cumplir en el servidor los interruptores de Configuracion. Antes solo
 * escondian botones en la interfaz: el endpoint seguia aceptando la peticion,
 * asi que bastaba con llamarlo a mano para saltarselos.
 *
 * Los ajustes vienen del token (los adjunta JwtStrategy, que ya carga el
 * tenant), asi que esto no anade ninguna consulta.
 *
 * Solo sirve para endpoints en los que TODO lo que devuelven cae bajo el
 * mismo permiso. Si la respuesta mezcla datos permitidos y no permitidos, el
 * servicio llama a isSettingAllowed y recorta lo que no toca.
 * ============================================================================
 */
@Injectable()
export class SettingsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const suffix = this.reflector.getAllAndOverride<SettingSuffix>(SETTING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @RequiresSetting no hay nada que comprobar.
    if (!suffix) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!isSettingAllowed(user, suffix)) {
      throw new ForbiddenException(
        `Tu clínica no permite ${NOMBRES[suffix]} con tu rol. Consúltalo con el administrador.`,
      );
    }
    return true;
  }
}
