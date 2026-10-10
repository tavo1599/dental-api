import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Insumos por linea de presupuesto.
 *
 * El tratamiento ya tenia su receta en el catalogo, pero esa es la de siempre.
 * Un paciente puede necesitar el doble de anestesia, u otra crema, y eso no
 * debe cambiar la receta para todos los demas. Ahora lo que el especialista
 * ajuste al armar el presupuesto se guarda pegado a su linea.
 *
 * Una linea sin filas aqui usa la receta del catalogo tal cual: es la
 * diferencia entre "no toque nada" y "para este paciente va esto".
 */
export class AddBudgetItemSupplies1791667935682 implements MigrationInterface {
  name = 'AddBudgetItemSupplies1791667935682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_item_supplies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "quantity" numeric(10,2) NOT NULL DEFAULT 1,
        "budgetItemId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        CONSTRAINT "PK_budget_item_supplies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_budget_item_supplies_item"
      ON "budget_item_supplies" ("budgetItemId")
    `);

    // Un mismo insumo dos veces en la misma linea es un error de la interfaz:
    // las cantidades se suman en una sola linea.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_budget_item_supplies_item_product"
      ON "budget_item_supplies" ("budgetItemId", "productId")
    `);

    /*
     * La marca hace falta porque consultando la base no se puede distinguir
     * "esta linea no guardo insumos" de "esta linea guardo que no gasta
     * nada": las dos devuelven cero filas.
     *
     * Con la marca puesta manda la linea, aunque este vacia. Sin marca -las
     * lineas de los presupuestos anteriores a esto- se usa la receta del
     * catalogo, que es como se comportaban hasta ahora.
     */
    await queryRunner.query(`
      ALTER TABLE "budget_items"
      ADD COLUMN IF NOT EXISTS "suppliesResolved" boolean NOT NULL DEFAULT false
    `);

    const fks: Array<[string, string, string, string]> = [
      ['FK_budget_item_supplies_item', 'budgetItemId', 'budget_items', 'CASCADE'],
      // RESTRICT: un producto que figura en un presupuesto no se borra.
      ['FK_budget_item_supplies_product', 'productId', 'products', 'RESTRICT'],
      ['FK_budget_item_supplies_tenant', 'tenantId', 'tenants', 'CASCADE'],
    ];

    for (const [nombre, columna, tabla, regla] of fks) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${nombre}') THEN
            ALTER TABLE "budget_item_supplies"
            ADD CONSTRAINT "${nombre}"
            FOREIGN KEY ("${columna}") REFERENCES "${tabla}"("id")
            ON DELETE ${regla};
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_item_supplies"`);
    await queryRunner.query(`ALTER TABLE "budget_items" DROP COLUMN IF EXISTS "suppliesResolved"`);
  }
}
