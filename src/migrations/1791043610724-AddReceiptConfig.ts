import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ============================================================================
 * ESTILO DE LA BOLETA
 *
 * Una columna jsonb con opciones ACOTADAS: colocacion del logo, tamano de
 * letra, color y papel (A4 o ticket de 80mm). No hay posiciones libres ni se
 * puede quitar informacion obligatoria, asi que una clinica no puede dejar su
 * boleta inservible.
 *
 * Nullable: a quien no la toque se le ve exactamente como hasta hoy, porque
 * los valores por defecto del frontend son el diseno actual.
 * ============================================================================
 */

export class AddReceiptConfig1791043610724 implements MigrationInterface {
    name = 'AddReceiptConfig1791043610724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "receiptConfig" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "receiptConfig"`);
    }

}
