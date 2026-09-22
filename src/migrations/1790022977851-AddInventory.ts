import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventory1790022977851 implements MigrationInterface {
    name = 'AddInventory1790022977851'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product_stocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" numeric(12,2) NOT NULL DEFAULT '0', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" uuid NOT NULL, "branchId" uuid NOT NULL, "tenantId" uuid NOT NULL, CONSTRAINT "PK_3e6eefa449c5773c5fe43ab113d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_01947de4f0cffa1514bd1cd615" ON "product_stocks" ("productId", "branchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_15015005c39084e8d20d2b221b" ON "product_stocks" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."products_category_enum" AS ENUM('higiene', 'ortodoncia', 'anestesicos', 'descartables', 'restauracion', 'instrumental', 'otros')`);
        await queryRunner.query(`CREATE TYPE "public"."products_unit_enum" AS ENUM('unidad', 'caja', 'paquete', 'ml', 'g')`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "sku" character varying(50), "description" text, "category" "public"."products_category_enum" NOT NULL DEFAULT 'otros', "unit" "public"."products_unit_enum" NOT NULL DEFAULT 'unidad', "isSellable" boolean NOT NULL DEFAULT false, "salePrice" numeric(10,2) NOT NULL DEFAULT '0', "isConsumable" boolean NOT NULL DEFAULT false, "cost" numeric(10,2) NOT NULL DEFAULT '0', "minStock" numeric(10,2) NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6804855ba1a19523ea57e0769b" ON "products" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."stock_movements_type_enum" AS ENUM('compra', 'venta', 'consumo', 'ajuste', 'devolucion', 'merma')`);
        await queryRunner.query(`CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."stock_movements_type_enum" NOT NULL, "quantity" numeric(12,2) NOT NULL, "unitCost" numeric(10,2) NOT NULL DEFAULT '0', "balanceAfter" numeric(12,2) NOT NULL DEFAULT '0', "referenceType" character varying(30), "referenceId" uuid, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" uuid NOT NULL, "branchId" uuid NOT NULL, "userId" uuid, "tenantId" uuid NOT NULL, CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8c7e69818125b5050db27931b1" ON "stock_movements" ("productId", "branchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_63ea52a6f09a7e2b3ef47c6dee" ON "stock_movements" ("tenantId", "branchId") `);
        await queryRunner.query(`ALTER TABLE "product_stocks" ADD CONSTRAINT "FK_5e5755d032c1551a16f4393cd9d" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_stocks" ADD CONSTRAINT "FK_1a8190152d25d0138f85a55a01e" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_stocks" ADD CONSTRAINT "FK_15015005c39084e8d20d2b221bb" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_6804855ba1a19523ea57e0769b4" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_a3acb59db67e977be45e382fc56" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_3dbc4d2ce7b9eecc9f284b925cd" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_4fc9f6fc2db22fc301f7c1c918b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_7dde280faf0d06b5b1b067b8ac1" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_7dde280faf0d06b5b1b067b8ac1"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_4fc9f6fc2db22fc301f7c1c918b"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_3dbc4d2ce7b9eecc9f284b925cd"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_a3acb59db67e977be45e382fc56"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_6804855ba1a19523ea57e0769b4"`);
        await queryRunner.query(`ALTER TABLE "product_stocks" DROP CONSTRAINT "FK_15015005c39084e8d20d2b221bb"`);
        await queryRunner.query(`ALTER TABLE "product_stocks" DROP CONSTRAINT "FK_1a8190152d25d0138f85a55a01e"`);
        await queryRunner.query(`ALTER TABLE "product_stocks" DROP CONSTRAINT "FK_5e5755d032c1551a16f4393cd9d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63ea52a6f09a7e2b3ef47c6dee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c7e69818125b5050db27931b1"`);
        await queryRunner.query(`DROP TABLE "stock_movements"`);
        await queryRunner.query(`DROP TYPE "public"."stock_movements_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6804855ba1a19523ea57e0769b"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."products_unit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."products_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_15015005c39084e8d20d2b221b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01947de4f0cffa1514bd1cd615"`);
        await queryRunner.query(`DROP TABLE "product_stocks"`);
    }

}
