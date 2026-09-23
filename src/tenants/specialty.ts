/**
 * ============================================================================
 * RUBRO DE LA CLINICA
 *
 * El sistema nacio para consultorios dentales, pero todo lo que lo sostiene
 * -pacientes, citas, presupuestos, pagos, caja, inventario, sedes- sirve igual
 * para cualquier consultorio. Lo unico verdaderamente dental es el odontograma
 * y el periodontograma.
 *
 * Este campo dice a que se dedica cada clinica. De el dependen tres cosas:
 *
 *   1. Que se le esconde (odontograma y periodontograma si no es dental)
 *   2. Que palabras se le muestran (el diccionario de vocabulario)
 *   3. Que ficha de anamnesis se le ofrece
 *
 * DENTAL es el valor por defecto a proposito: las clinicas que ya existen no
 * deben notar ningun cambio.
 * ============================================================================
 */
export enum ClinicSpecialty {
  DENTAL = 'dental',
  PSYCHOLOGY = 'psicologia',
  AESTHETICS = 'estetica',
}

/** Nombre del rubro tal como se le ensena a una persona. */
export const SPECIALTY_LABELS: Record<ClinicSpecialty, string> = {
  [ClinicSpecialty.DENTAL]: 'Odontología',
  [ClinicSpecialty.PSYCHOLOGY]: 'Psicología',
  [ClinicSpecialty.AESTHETICS]: 'Estética y dermatología',
};

/**
 * El odontograma y el periodontograma solo tienen sentido en odontologia.
 * Se pregunta por aqui y no comparando con === en cada sitio, para que el dia
 * que entre un rubro nuevo que si los use baste con cambiarlo aqui.
 */
export function usesOdontogram(specialty: ClinicSpecialty | null | undefined): boolean {
  // Sin valor se asume dental: una clinica anterior a este campo lo es.
  return (specialty ?? ClinicSpecialty.DENTAL) === ClinicSpecialty.DENTAL;
}
