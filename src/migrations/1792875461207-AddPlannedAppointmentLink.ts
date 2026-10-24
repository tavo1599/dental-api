import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enlace entre el plan de proxima cita y la cita de verdad.
 *
 * La fecha de "proxima cita" de la historia clinica es una INTENCION clinica
 * ("vuelve en tres meses a control"): no tiene hora, ni doctor, ni duracion.
 * Una cita de la agenda es un espacio reservado y necesita las tres cosas.
 *
 * Por eso no se convierte una en otra a ciegas: cuando la clinica decide
 * agendar en el momento, se crea la cita de verdad -con su hora y su control
 * de cruces- y se guarda aqui a cual corresponde. Asi la historia conserva lo
 * que se escribio y puede mostrar en que quedo esa cita.
 *
 * SET NULL: si la cita se borra, la entrada de historia se queda sin enlace
 * pero NO se borra. Es un registro clinico; lo que se escribio se queda.
 */
export class AddPlannedAppointmentLink1792875461207 implements MigrationInterface {
  name = 'AddPlannedAppointmentLink1792875461207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clinical_history_entries"
      ADD COLUMN IF NOT EXISTS "plannedAppointmentId" uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_history_planned_appointment'
        ) THEN
          ALTER TABLE "clinical_history_entries"
          ADD CONSTRAINT "FK_history_planned_appointment"
          FOREIGN KEY ("plannedAppointmentId") REFERENCES "appointments"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_history_planned_appointment"
      ON "clinical_history_entries" ("plannedAppointmentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_history_planned_appointment"`);
    await queryRunner.query(`ALTER TABLE "clinical_history_entries" DROP CONSTRAINT IF EXISTS "FK_history_planned_appointment"`);
    await queryRunner.query(`ALTER TABLE "clinical_history_entries" DROP COLUMN IF EXISTS "plannedAppointmentId"`);
  }
}
