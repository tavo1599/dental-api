import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminTransfer1790051414133 implements MigrationInterface {
    name = 'AddAdminTransfer1790051414133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."admin_transfers_status_enum" AS ENUM('pendiente', 'completada', 'cancelada')`);
        await queryRunner.query(`CREATE TABLE "admin_transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "codeHash" character varying(64), "expiresAt" TIMESTAMP, "status" "public"."admin_transfers_status_enum" NOT NULL DEFAULT 'pendiente', "attempts" integer NOT NULL DEFAULT '0', "forcedBySuperAdmin" boolean NOT NULL DEFAULT false, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "fromUserId" uuid, "toUserId" uuid, CONSTRAINT "PK_91e34fed67b67372056fc6fe6f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eab5d0c70abd634713f9526803" ON "admin_transfers" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "admin_transfers" ADD CONSTRAINT "FK_eab5d0c70abd634713f95268039" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "admin_transfers" ADD CONSTRAINT "FK_db81d6628a0101875be6cd70b65" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "admin_transfers" ADD CONSTRAINT "FK_4e86389ea2f187a0d838f85ef03" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_transfers" DROP CONSTRAINT "FK_4e86389ea2f187a0d838f85ef03"`);
        await queryRunner.query(`ALTER TABLE "admin_transfers" DROP CONSTRAINT "FK_db81d6628a0101875be6cd70b65"`);
        await queryRunner.query(`ALTER TABLE "admin_transfers" DROP CONSTRAINT "FK_eab5d0c70abd634713f95268039"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eab5d0c70abd634713f9526803"`);
        await queryRunner.query(`DROP TABLE "admin_transfers"`);
        await queryRunner.query(`DROP TYPE "public"."admin_transfers_status_enum"`);
    }

}
