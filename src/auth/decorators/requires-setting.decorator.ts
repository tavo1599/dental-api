import { SetMetadata } from '@nestjs/common';

/**
 * Permisos que cada clinica configura por su cuenta en Configuracion.
 *
 * Solo se nombra el sufijo: el guardia le antepone el rol de quien pide
 * ("dentists" o "assistants") para formar la clave real que esta guardada en
 * tenant.systemSettings. Asi un mismo endpoint sirve para los dos roles sin
 * repetir decoradores.
 */
export type SettingSuffix =
  | 'CanSeePrices'
  | 'CanManageBudgets'
  | 'CanSeeReports'
  | 'CanManageTreatments'
  | 'CanSeeDashboardStats';

export const SETTING_KEY = 'requiredSetting';

/**
 * Exige que la clinica tenga activado este permiso para el rol de quien pide.
 * Sin SettingsGuard delante no hace nada, igual que @Roles sin RolesGuard.
 */
export const RequiresSetting = (suffix: SettingSuffix) =>
  SetMetadata(SETTING_KEY, suffix);
