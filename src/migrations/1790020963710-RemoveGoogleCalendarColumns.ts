import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Limpia las 4 columnas que quedaron huerfanas al eliminar la integracion con
 * Google Calendar. Estaban vacias (0 filas con datos) y ningun codigo las usa.
 * El down() las recrea con sus tipos originales.
 */

export class RemoveGoogleCalendarColumns1790020963710 implements MigrationInterface {
    name = 'RemoveGoogleCalendarColumns1790020963710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "googleEventId"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "googleRefreshToken"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "googleCalendarId"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "googleAccessToken"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ADD "googleAccessToken" text`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "googleCalendarId" text`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "googleRefreshToken" text`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "googleEventId" character varying`);
    }

}
