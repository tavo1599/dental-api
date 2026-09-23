import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ============================================================================
 * RUBRO DE LA CLINICA
 *
 * Con esto el sistema deja de dar por hecho que todas sus clinicas son
 * dentales. Toda clinica existente queda como 'dental' (es el DEFAULT y la
 * columna es NOT NULL), asi que nadie nota absolutamente nada.
 *
 * Idempotente a proposito: Dokploy despliega solo al hacer push, y el
 * contenedor nuevo arranca ANTES de que se pueda correr la migracion. Como la
 * entidad ya pide esta columna, conviene poder aplicarla a mano en la base
 * antes de subir el codigo y correr despues la migracion, que se limita a
 * dejar constancia. Sin esto hay una ventana con la API caida.
 * ============================================================================
 */
export class AddClinicSpecialty1790087904837 implements MigrationInterface {
  name = 'AddClinicSpecialty1790087904837';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres no admite CREATE TYPE IF NOT EXISTS, de ahi el bloque.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenants_specialty_enum') THEN
          CREATE TYPE "public"."tenants_specialty_enum" AS ENUM ('dental', 'psicologia', 'estetica');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "specialty" "public"."tenants_specialty_enum"
      NOT NULL DEFAULT 'dental'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "specialty"`);
    await queryRunner.query(`DROP TYPE "public"."tenants_specialty_enum"`);
  }
}
