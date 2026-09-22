import { FindOptionsWhere } from 'typeorm';

/**
 * ============================================================================
 * SCOPE MULTI-CLINICA / MULTI-SEDE
 *
 * Un unico sitio donde se decide como se filtran los datos. La alternativa
 * -repetir el `where` a mano en cada uno de los ~227 puntos que hoy filtran
 * por tenantId- es justo lo que provoco el IDOR de consentimientos: basta
 * olvidarlo en un sitio para abrir un agujero.
 *
 * Reglas:
 *   tenantId -> SIEMPRE. Es la frontera de seguridad, no es negociable.
 *   branchId -> si viene, filtra por esa sede; si es null, no filtra
 *               (vista consolidada del admin).
 * ============================================================================
 */

/** Filtro para entidades que se separan por sede (citas, caja, stock...). */
export function branchScope<T>(
  tenantId: string,
  branchId: string | null,
): FindOptionsWhere<T> {
  const where: Record<string, unknown> = { tenant: { id: tenantId } };
  if (branchId) {
    where.branch = { id: branchId };
  }
  return where as unknown as FindOptionsWhere<T>;
}

/**
 * Filtro para entidades compartidas por toda la clinica (pacientes, historia
 * clinica, odontograma, catalogo de tratamientos). Se separa del anterior a
 * proposito: que quede explicito en el codigo que NO van por sede.
 */
export function tenantScope<T>(tenantId: string): FindOptionsWhere<T> {
  return { tenant: { id: tenantId } } as unknown as FindOptionsWhere<T>;
}

/**
 * Version para QueryBuilder. Devuelve la condicion y los parametros ya listos.
 *
 *   const { clause, params } = branchScopeQb('a', tenantId, branchId);
 *   qb.where(clause, params);
 */
export function branchScopeQb(
  alias: string,
  tenantId: string,
  branchId: string | null,
): { clause: string; params: Record<string, unknown> } {
  const params: Record<string, unknown> = { scopeTenantId: tenantId };
  let clause = `${alias}."tenantId" = :scopeTenantId`;

  if (branchId) {
    clause += ` AND ${alias}."branchId" = :scopeBranchId`;
    params.scopeBranchId = branchId;
  }
  return { clause, params };
}
