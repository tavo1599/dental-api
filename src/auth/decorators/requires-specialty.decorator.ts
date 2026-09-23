import { SetMetadata } from '@nestjs/common';
import { ClinicSpecialty } from '../../tenants/specialty';

export const SPECIALTY_KEY = 'requiredSpecialty';

/**
 * Restringe una ruta a los rubros indicados.
 *
 * Es para lo que solo tiene sentido en un tipo de consultorio: el odontograma
 * en odontologia, la evaluacion de riesgo en psicologia, las
 * contraindicaciones de piel en estetica. No es configurable ni negociable,
 * a diferencia de @RequiresSetting: o la clinica es de ese rubro o no lo es.
 *
 * Necesita SpecialtyGuard delante, igual que @Roles necesita RolesGuard.
 */
export const RequiresSpecialty = (...specialties: ClinicSpecialty[]) =>
  SetMetadata(SPECIALTY_KEY, specialties);
