import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ============================================================================
 * SESIONES DE UN PAQUETE
 *
 * Para quien cobra por sesiones: psicologia y estetica casi siempre, y una
 * ortodoncia dental tambien.
 *
 *   treatments.defaultSessions    en cuantas sesiones se presta el servicio
 *   budget_items.sessionsTotal    las pactadas con ESE paciente
 *   treatment_session_logs        una fila por sesion realizada
 *
 * Las sesiones HECHAS se cuentan de la tabla de registro y no se guardan en
 * un contador, igual que el stock se calcula del kardex: un contador se
 * desincroniza en cuanto algo falla a mitad.
 *
 * Las dos columnas nuevas llevan DEFAULT 1, asi que todo lo que ya existe
 * queda como "una sola sesion" y nada cambia de comportamiento.
 *
 * Las dos ALTER van con IF NOT EXISTS porque las entidades ya piden esas
 * columnas y Dokploy despliega solo al hacer push: conviene poder aplicarlas
 * a mano antes de subir el codigo y correr despues la migracion.
 * ============================================================================
 */

export class AddTreatmentSessions1790879718544 implements MigrationInterface {
    name = 'AddTreatmentSessions1790879718544'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "treatment_session_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "performedAt" date NOT NULL, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "budgetItemId" uuid NOT NULL, "patientId" uuid NOT NULL, "performedById" uuid, "tenantId" uuid NOT NULL, "branchId" uuid NOT NULL, CONSTRAINT "PK_ded5073d385f8357835c1b6ce0b" PRIMARY KEY ("id")); COMMENT ON COLUMN "treatment_session_logs"."performedAt" IS 'Dia en que se realizo la sesion'; COMMENT ON COLUMN "treatment_session_logs"."notes" IS 'Nota breve de la sesión'`);
        await queryRunner.query(`CREATE INDEX "IDX_596afb6a06a01e14d253eb8719" ON "treatment_session_logs" ("tenantId", "patientId") `);
        await queryRunner.query(`ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "defaultSessions" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "budget_items" ADD COLUMN IF NOT EXISTS "sessionsTotal" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" ADD CONSTRAINT "FK_eabd8d60a1044491023f04918a2" FOREIGN KEY ("budgetItemId") REFERENCES "budget_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" ADD CONSTRAINT "FK_aebc998a80346182d2a108977ec" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" ADD CONSTRAINT "FK_90c4bb6c1580472315acab63b49" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" ADD CONSTRAINT "FK_18764404a504b01368f0b567f5a" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" ADD CONSTRAINT "FK_0e13de544b733eec70542c42cfa" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" DROP CONSTRAINT "FK_0e13de544b733eec70542c42cfa"`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" DROP CONSTRAINT "FK_18764404a504b01368f0b567f5a"`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" DROP CONSTRAINT "FK_90c4bb6c1580472315acab63b49"`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" DROP CONSTRAINT "FK_aebc998a80346182d2a108977ec"`);
        await queryRunner.query(`ALTER TABLE "treatment_session_logs" DROP CONSTRAINT "FK_eabd8d60a1044491023f04918a2"`);
        await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN "sessionsTotal"`);
        await queryRunner.query(`ALTER TABLE "treatments" DROP COLUMN "defaultSessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_596afb6a06a01e14d253eb8719"`);
        await queryRunner.query(`DROP TABLE "treatment_session_logs"`);
    }

}
