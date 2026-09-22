import { UserRole } from '../users/entities/user.entity';
import { SettingSuffix } from './decorators/requires-setting.decorator';

/**
 * ============================================================================
 * PERMISOS QUE CONFIGURA CADA CLINICA
 *
 * Unico sitio que decide si un permiso de systemSettings esta concedido. Lo
 * usan tanto SettingsGuard (para cortar el acceso a un endpoint entero) como
 * los servicios que solo necesitan ocultar unos campos de la respuesta.
 *
 * Hay dos casos y conviene no confundirlos:
 *
 *  - Endpoint entero: el permiso cubre todo lo que devuelve. Va con
 *    @RequiresSetting + SettingsGuard y responde 403.
 *  - Solo unos campos: el endpoint devuelve cosas permitidas y no permitidas
 *    mezcladas (el resumen del panel trae ingresos, pero tambien las citas
 *    del dia). Ahi se llama a isSettingAllowed y se recorta la respuesta;
 *    bloquearlo entero dejaria al doctor sin su agenda.
 * ============================================================================
 */

/**
 * Copiados del default de la columna systemSettings en tenant.entity.ts.
 * Hacen falta porque una clinica antigua puede tener la columna a null o sin
 * alguna clave: sin esto, un permiso ausente se leeria como "denegado" y les
 * dejaria de funcionar algo que hoy usan.
 *
 * Si se cambia un valor aqui, hay que cambiarlo tambien en la entidad.
 */
export const SETTING_DEFAULTS: Record<string, boolean> = {
  dentistsCanSeePrices: true,
  dentistsCanManageBudgets: true,
  dentistsCanSeeReports: false,
  dentistsCanManageTreatments: true,
  dentistsCanSeeDashboardStats: true,

  assistantsCanSeePrices: true,
  assistantsCanManageBudgets: true,
  assistantsCanSeeReports: false,
  assistantsCanManageTreatments: false,
  assistantsCanSeeDashboardStats: false,
};

/** Lo que va en request.user; se declara aqui para no depender del guardia. */
export interface RequestUser {
  role?: string;
  isSuperAdmin?: boolean;
  systemSettings?: Record<string, boolean | undefined> | null;
}

/**
 * El titular y los admins de sucursal pasan siempre: la configuracion existe
 * para limitar a doctores y asistentes, no a quien la escribe.
 */
export function isSettingAllowed(
  user: RequestUser | undefined,
  suffix: SettingSuffix,
): boolean {
  if (!user) return false;

  if (
    user.isSuperAdmin ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.BRANCH_ADMIN
  ) {
    return true;
  }

  const prefijo =
    user.role === UserRole.DENTIST
      ? 'dentists'
      : user.role === UserRole.ASSISTANT
        ? 'assistants'
        : null;

  // Un rol que no esta contemplado no se deja pasar por descarte.
  if (!prefijo) return false;

  const clave = `${prefijo}${suffix}`;
  return user.systemSettings?.[clave] ?? SETTING_DEFAULTS[clave] ?? false;
}
