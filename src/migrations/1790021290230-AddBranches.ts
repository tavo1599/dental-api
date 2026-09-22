import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBranches1790021290230 implements MigrationInterface {
    name = 'AddBranches1790021290230'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying(20), "isMain" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "address" character varying, "department" character varying, "province" character varying, "district" character varying, "phone" character varying, "email" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_19db6a12993aa421cc98437663" ON "branches" ("tenantId") `);
        await queryRunner.query(`CREATE TABLE "user_branches" ("userId" uuid NOT NULL, "branchId" uuid NOT NULL, CONSTRAINT "PK_ad3d4d119e012f3b6ab0e0e2180" PRIMARY KEY ("userId", "branchId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_730d741ac106176848e5b3c96c" ON "user_branches" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d4bfb1375daa4e5e17f3def240" ON "user_branches" ("branchId") `);
        await queryRunner.query(`ALTER TABLE "branches" ADD CONSTRAINT "FK_19db6a12993aa421cc984376635" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_branches" ADD CONSTRAINT "FK_730d741ac106176848e5b3c96cd" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_branches" ADD CONSTRAINT "FK_d4bfb1375daa4e5e17f3def2403" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_branches" DROP CONSTRAINT "FK_d4bfb1375daa4e5e17f3def2403"`);
        await queryRunner.query(`ALTER TABLE "user_branches" DROP CONSTRAINT "FK_730d741ac106176848e5b3c96cd"`);
        await queryRunner.query(`ALTER TABLE "branches" DROP CONSTRAINT "FK_19db6a12993aa421cc984376635"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d4bfb1375daa4e5e17f3def240"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_730d741ac106176848e5b3c96c"`);
        await queryRunner.query(`DROP TABLE "user_branches"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19db6a12993aa421cc98437663"`);
        await queryRunner.query(`DROP TABLE "branches"`);
    }

}
