import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ============================================================================
 * branchId en las entidades operativas (citas, presupuestos, pagos, gastos)
 *
 * TypeORM genera por defecto `ADD "branchId" uuid NOT NULL`, que REVIENTA en
 * cualquier tabla que ya tenga filas. Por eso esta migracion esta escrita a
 * mano con el patron seguro en tres pasos:
 *
 *   1. ADD COLUMN nulable          -> no rompe nada, las filas quedan en NULL
 *   2. UPDATE de relleno           -> cada fila hereda la sede principal de su
 *                                     propia clinica
 *   3. ALTER ... SET NOT NULL      -> ya con todo relleno, se exige el dato
 *
 * Todo corre dentro de una transaccion: si el paso 2 dejara aunque sea una
 * fila sin sede, el paso 3 falla y se revierte la migracion entera. Nunca
 * queda a medias.
 *
 * Los nombres de indices y constraints son los que genera TypeORM, a proposito:
 * asi un `migration:generate` futuro no detecta deriva.
 * ============================================================================
 */
export class AddBranchToOperations1790022242515 implements MigrationInterface {
  name = 'AddBranchToOperations1790022242515';

  private readonly tables = [
    { table: 'appointments', fk: 'FK_299d8147ef59909b1e6531e791c', idx: 'IDX_f8f845faa610ee5d7e7473d794' },
    { table: 'payments', fk: 'FK_827d04dd3e917e88271d43e664b', idx: 'IDX_ae74b5321a3876e045aa6b0c73' },
    { table: 'budgets', fk: 'FK_8ef37a552f8118518bdb1251eaf', idx: 'IDX_259088b7aa67d23961b60c6535' },
    { table: 'expenses', fk: 'FK_eed45f691864a80afbd9e2178ce', idx: 'IDX_c933cd03469d9196277fe31768' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, fk, idx } of this.tables) {
      // 1. Columna nulable: aditivo puro, no afecta a ninguna fila existente.
      await queryRunner.query(`ALTER TABLE "${table}" ADD "branchId" uuid`);

      // 2. Cada fila hereda la sede principal de SU clinica. El filtro por
      //    tenantId garantiza que ninguna fila se asigne a otra clinica.
      await queryRunner.query(`
        UPDATE "${table}" x
        SET "branchId" = b."id"
        FROM "branches" b
        WHERE b."tenantId" = x."tenantId"
          AND b."isMain" = true
          AND x."branchId" IS NULL
      `);

      // 3. Si algo quedo sin rellenar, esto falla y revierte todo.
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "branchId" SET NOT NULL`,
      );

      await queryRunner.query(
        `CREATE INDEX "${idx}" ON "${table}" ("tenantId", "branchId")`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${fk}" FOREIGN KEY ("branchId") ` +
          `REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, fk, idx } of [...this.tables].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${fk}"`,
      );
      await queryRunner.query(`DROP INDEX "public"."${idx}"`);
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "branchId"`);
    }
  }
}
