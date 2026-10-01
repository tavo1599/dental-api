import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ============================================================================
 * RECETA DE INSUMOS POR TRATAMIENTO
 *
 * Que gasta cada tratamiento y cuanto. La clinica la llena una vez y a partir
 * de ahi el stock baja solo al registrar cada sesion.
 *
 * Una tabla nueva, NO se toca ninguna existente. Y es opcional: un tratamiento
 * sin receta no consume nada y todo sigue funcionando igual que antes.
 * ============================================================================
 */

export class AddTreatmentSupplies1790888420211 implements MigrationInterface {
    name = 'AddTreatmentSupplies1790888420211'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "treatment_supplies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" numeric(10,2) NOT NULL DEFAULT '1', "treatmentId" uuid NOT NULL, "productId" uuid NOT NULL, "tenantId" uuid NOT NULL, CONSTRAINT "UQ_treatment_supply" UNIQUE ("treatmentId", "productId"), CONSTRAINT "PK_44b214c05ca454d60b111f76893" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_45683f438672f56b19d7e41077" ON "treatment_supplies" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "treatment_supplies" ADD CONSTRAINT "FK_2aa4a1397f069dcd7b7a8845b4f" FOREIGN KEY ("treatmentId") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_supplies" ADD CONSTRAINT "FK_fdd177d2db6717c3f24bbb2572d" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_supplies" ADD CONSTRAINT "FK_45683f438672f56b19d7e41077a" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "treatment_supplies" DROP CONSTRAINT "FK_45683f438672f56b19d7e41077a"`);
        await queryRunner.query(`ALTER TABLE "treatment_supplies" DROP CONSTRAINT "FK_fdd177d2db6717c3f24bbb2572d"`);
        await queryRunner.query(`ALTER TABLE "treatment_supplies" DROP CONSTRAINT "FK_2aa4a1397f069dcd7b7a8845b4f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_45683f438672f56b19d7e41077"`);
        await queryRunner.query(`DROP TABLE "treatment_supplies"`);
    }

}
