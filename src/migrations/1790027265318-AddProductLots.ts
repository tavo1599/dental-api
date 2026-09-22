import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Introduce el control de lotes y fechas de vencimiento.
 *
 * Ademas de crear la tabla, convierte las existencias que YA hay en un lote
 * "sin identificar" (sin numero ni caducidad). Asi la invariante
 * stock = SUM(lotes) se cumple desde el primer momento y no queda stock
 * historico fuera del nuevo modelo.
 */
export class AddProductLots1790027265318 implements MigrationInterface {
    name = 'AddProductLots1790027265318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product_lots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lotNumber" character varying(60), "expiryDate" date, "quantity" numeric(12,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" uuid NOT NULL, "branchId" uuid NOT NULL, "tenantId" uuid NOT NULL, CONSTRAINT "PK_42f4d0a466e282d49692260b947" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_21ada3211b48c2d32f78f24ce9" ON "product_lots" ("productId", "branchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_afec375d5e56b341b801d9d014" ON "product_lots" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD "lotId" uuid`);
        await queryRunner.query(`ALTER TABLE "product_lots" ADD CONSTRAINT "FK_df748f919c18c782f47dab477a8" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_lots" ADD CONSTRAINT "FK_98724614502c1a9803c2b18894a" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_lots" ADD CONSTRAINT "FK_afec375d5e56b341b801d9d014d" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_7b75c399f270553017054ea41a3" FOREIGN KEY ("lotId") REFERENCES "product_lots"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Lo que ya habia en stock pasa a ser un lote sin identificar: no
        // sabemos su numero ni su caducidad, pero la cantidad debe cuadrar.
        await queryRunner.query(`
            INSERT INTO "product_lots"
                ("id", "productId", "branchId", "lotNumber", "expiryDate", "quantity", "tenantId")
            SELECT uuid_generate_v4(), ps."productId", ps."branchId", NULL, NULL,
                   ps."quantity", ps."tenantId"
            FROM "product_stocks" ps
            WHERE ps."quantity" <> 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Los lotes se van con la tabla, pero se borran primero para dejar
        // explicito que el backfill tambien se deshace.
        await queryRunner.query(`DELETE FROM "product_lots"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_7b75c399f270553017054ea41a3"`);
        await queryRunner.query(`ALTER TABLE "product_lots" DROP CONSTRAINT "FK_afec375d5e56b341b801d9d014d"`);
        await queryRunner.query(`ALTER TABLE "product_lots" DROP CONSTRAINT "FK_98724614502c1a9803c2b18894a"`);
        await queryRunner.query(`ALTER TABLE "product_lots" DROP CONSTRAINT "FK_df748f919c18c782f47dab477a8"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "lotId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_afec375d5e56b341b801d9d014"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_21ada3211b48c2d32f78f24ce9"`);
        await queryRunner.query(`DROP TABLE "product_lots"`);
    }

}
