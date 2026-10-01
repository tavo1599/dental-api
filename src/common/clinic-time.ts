import { BadRequestException } from '@nestjs/common';

/**
 * ============================================================================
 * FECHA Y HORA QUE MANDA EL CLIENTE
 *
 * El sistema opera en Peru, asi que cuando llega una fecha con hora SIN zona
 * -lo que produce un <input type="datetime-local">- se entiende como hora de
 * Lima. Eso es lo que se queria al escribir `new Date(valor + '-05:00')`.
 *
 * El problema de concatenar a ciegas es que si el cliente SI manda la zona
 * (una app movil, una integracion, o cualquiera que use ISO-8601 estandar con
 * Z) sale una cadena imposible como "...T15:00:00.000Z-05:00", `new Date` la
 * convierte en Invalid Date y Postgres recibe "0NaN-NaN-NaN..." y responde con
 * un error 500. Y @IsDateString() no lo detecta, porque para el la fecha con Z
 * es perfectamente valida.
 *
 * Aqui se mira si la cadena ya trae zona y solo se le pone la de Lima cuando
 * no la tiene. Si aun asi no se puede interpretar, se devuelve un 400 con un
 * mensaje claro en lugar de dejar que explote mas abajo.
 * ============================================================================
 */

/** Zona de la clinica. Si algun dia hay clinicas fuera de Peru, sale de aqui. */
const CLINIC_UTC_OFFSET = '-05:00';

/** Z, +HH:MM, -HH:MM o +HHMM al final de la cadena. */
const TIENE_ZONA = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Interpreta una fecha con hora recibida del cliente.
 *
 * @param valor  lo que llego en el DTO
 * @param campo  nombre del campo, para poder decir cual esta mal
 */
export function parseClinicDateTime(
  valor: string | Date,
  campo = 'fecha',
): Date {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new BadRequestException(`La ${campo} no es válida.`);
    }
    return valor;
  }

  const texto = String(valor ?? '').trim();
  if (!texto) {
    throw new BadRequestException(`Falta la ${campo}.`);
  }

  // Solo se le anade la zona de la clinica si no trae una.
  const conZona = TIENE_ZONA.test(texto) ? texto : `${texto}${CLINIC_UTC_OFFSET}`;
  const fecha = new Date(conZona);

  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException(
      `La ${campo} no se pudo interpretar: "${texto}".`,
    );
  }
  return fecha;
}
