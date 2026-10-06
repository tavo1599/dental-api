import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Productos como linea del presupuesto.
 *
 * Hasta ahora una linea solo podia ser un tratamiento del catalogo, asi que
 * para cobrarle a un paciente un kit de blanqueamiento o una crema habia que
 * hacerle una venta aparte y entregarle dos papeles. Ahora la misma linea
 * puede apuntar a un tratamiento O a un producto, y el total y la boleta la
 * incluyen sin tratarla distinto.
 *
 * "treatmentId" ya era nullable, asi que no hay que tocarlo.
 *
 * El CHECK es a proposito tolerante -prohibe que una linea sea las dos cosas,
 * pero no exige que sea alguna-. Si exigiera una, bastaria una fila vieja con
 * el tratamiento ya borrado para que la migracion falle, y como Dokploy
 * despliega solo, un fallo aqui tumba el despliegue entero. Que haya
 * exactamente una lo garantiza el servicio al crear el presupuesto.
 */
export class AddProductsToBudgets1791248644480 implements MigrationInterface {
  name = 'AddProductsToBudgets1791248644480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "budget_items"
      ADD COLUMN IF NOT EXISTS "productId" uuid
    `);

    // RESTRICT: un producto que ya figura en un presupuesto no se puede
    // borrar. Igual que en las ventas; los productos se desactivan, no se
    // borran, asi que no estorba.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_budget_items_product'
        ) THEN
          ALTER TABLE "budget_items"
          ADD CONSTRAINT "FK_budget_items_product"
          FOREIGN KEY ("productId") REFERENCES "products"("id")
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_budget_items_product"
      ON "budget_items" ("productId")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_budget_item_one_kind'
        ) THEN
          ALTER TABLE "budget_items"
          ADD CONSTRAINT "CHK_budget_item_one_kind"
          CHECK (NOT ("treatmentId" IS NOT NULL AND "productId" IS NOT NULL));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_items" DROP CONSTRAINT IF EXISTS "CHK_budget_item_one_kind"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_budget_items_product"`);
    await queryRunner.query(`ALTER TABLE "budget_items" DROP CONSTRAINT IF EXISTS "FK_budget_items_product"`);
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN IF EXISTS "productId"`);
  }
}
