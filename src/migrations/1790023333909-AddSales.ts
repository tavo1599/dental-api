import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSales1790023333909 implements MigrationInterface {
    name = 'AddSales1790023333909'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sale_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" numeric(12,2) NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "subtotal" numeric(10,2) NOT NULL, "saleId" uuid, "productId" uuid NOT NULL, CONSTRAINT "PK_5a7dc5b4562a9e590528b3e08ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."sales_status_enum" AS ENUM('completada', 'anulada')`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" integer NOT NULL, "customerName" character varying, "customerDocument" character varying(20), "subtotal" numeric(10,2) NOT NULL DEFAULT '0', "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "total" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."sales_status_enum" NOT NULL DEFAULT 'completada', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "patientId" uuid, "soldById" uuid, "branchId" uuid NOT NULL, "tenantId" uuid NOT NULL, CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bc5dec47a02dbab59096309c31" ON "sales" ("branchId", "number") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d1ea8bf2f7d265e748550bfcc" ON "sales" ("tenantId", "branchId") `);
        await queryRunner.query(`ALTER TABLE "payments" ADD "saleId" uuid`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "CHK_payment_budget_xor_sale" CHECK (("budgetId" IS NOT NULL AND "saleId" IS NULL) OR ("budgetId" IS NULL AND "saleId" IS NOT NULL))`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_c642be08de5235317d4cf3deb40" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_d675aea38a16313e844662c48f8" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_158af5f0f7bcd1d605e138a98a2" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_a579b2073803d038e23833cec33" FOREIGN KEY ("soldById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_3025cd80c0a8de190072940e10f" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_37606c7b1560c6be428c7a48959" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_e15427928c7a02bd304d628c41e" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_e15427928c7a02bd304d628c41e"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_37606c7b1560c6be428c7a48959"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_3025cd80c0a8de190072940e10f"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_a579b2073803d038e23833cec33"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_158af5f0f7bcd1d605e138a98a2"`);
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_d675aea38a16313e844662c48f8"`);
        await queryRunner.query(`ALTER TABLE "sale_items" DROP CONSTRAINT "FK_c642be08de5235317d4cf3deb40"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "CHK_payment_budget_xor_sale"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "saleId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d1ea8bf2f7d265e748550bfcc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc5dec47a02dbab59096309c31"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
        await queryRunner.query(`DROP TABLE "sale_items"`);
    }

}
