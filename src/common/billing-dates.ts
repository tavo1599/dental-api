/**
 * ============================================================================
 * FECHAS DE COBRO
 *
 * Todo lo que tenga que ver con el ciclo de pago de una clinica pasa por aqui.
 * Son funciones puras y sin dependencias a proposito: asi se pueden probar
 * solas y no hay dos sitios calculando la misma fecha de forma distinta.
 *
 * Dos cuidados que hay que mantener al tocar este archivo:
 *
 *  1. NUNCA usar `new Date('2026-09-22')`. Esa forma se interpreta como
 *     medianoche UTC y en Peru (UTC-5) la fecha retrocede un dia. Aqui se
 *     construye siempre con `new Date(anio, mes, dia)`, que es hora local,
 *     igual que como TypeORM guarda las columnas `date`.
 *
 *  2. NUNCA usar `setMonth(getMonth() + 1)` para avanzar un mes. Desborda:
 *     el 31 de enero se convierte en el 3 de marzo porque febrero no tiene 31.
 *     Para eso esta `addOneMonth`, que respeta el dia de cobro.
 * ============================================================================
 */

/** Medianoche local del dia que se le pase, sin hora ni zona arrastrada. */
export function startOfDay(value: Date | string): Date {
  if (typeof value === 'string') {
    // 'YYYY-MM-DD' partido a mano; dejarselo al constructor lo lee como UTC.
    const [anio, mes, dia] = value.slice(0, 10).split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Hoy a medianoche, para comparar dias sin que estorbe la hora. */
export function startOfToday(): Date {
  return startOfDay(new Date());
}

/**
 * Avanza un mes conservando el dia de cobro.
 *
 * El dia se pasa aparte y no se saca de `from` porque hay meses que no lo
 * tienen. A quien paga los 31 se le cobra el 28 de febrero, pero en marzo
 * vuelve al 31: el ancla no se pierde. Si se dedujera de la fecha anterior,
 * despues de febrero se quedaria pegado al 28 para siempre.
 */
export function addOneMonth(from: Date, billingDay: number): Date {
  const anio = from.getFullYear();
  const mesDestino = from.getMonth() + 1; // si es 12, el constructor pasa de anio solo

  // Dia 0 del mes siguiente = ultimo dia del mes destino.
  const ultimoDia = new Date(anio, mesDestino + 1, 0).getDate();

  return new Date(anio, mesDestino, Math.min(billingDay, ultimoDia));
}

/**
 * Dias enteros de `desde` hasta `hasta`. Positivo si `hasta` esta en el
 * futuro, negativo si ya paso.
 *
 * Se redondea porque los cambios de horario de verano meten horas sueltas en
 * la resta y un dia puede durar 23 o 25 horas.
 */
export function daysUntil(desde: Date, hasta: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(hasta).getTime() - startOfDay(desde).getTime()) / MS_POR_DIA);
}

/** 22 de septiembre de 2026 — para los correos, que los lee una persona. */
export function formatLongDate(value: Date | string): string {
  return startOfDay(value).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
