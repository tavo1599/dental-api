import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ============================================================================
 * DATOS DE SESION PROPIOS DE CADA RUBRO
 *
 * Una columna jsonb en la nota de cada sesion, para lo que anota cada area:
 *
 *   psicologia  tecnicas, tareas, estado del paciente, riesgo
 *   estetica    zonas tratadas, parametros del equipo, producto y lote
 *
 * En jsonb y no una columna por campo porque casi todas quedarian nulas en los
 * demas rubros. Son datos que se leen al volver el paciente, no se agregan en
 * reportes.
 *
 * Nullable: todo lo que ya existe se queda como esta.
 * ============================================================================
 */

export class AddSessionDetails1790884548689 implements MigrationInterface {
    name = 'AddSessionDetails1790884548689'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinical_history_entries" ADD COLUMN IF NOT EXISTS "sessionDetails" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinical_history_entries" DROP COLUMN "sessionDetails"`);
    }

}
