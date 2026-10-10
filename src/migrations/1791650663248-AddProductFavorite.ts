import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Productos marcados como favoritos.
 *
 * En el mostrador se venden siempre los mismos cuatro o cinco productos, pero
 * el catalogo entero se pintaba en una cuadricula sin fin: habia que bajar
 * hasta el final para llegar a cualquier otra cosa de la pantalla.
 *
 * La marca es de la CLINICA, no de cada usuario: quien atiende el mostrador y
 * quien administra deben tener los mismos productos a mano, y asi no hay que
 * configurarlo usuario por usuario.
 */
export class AddProductFavorite1791650663248 implements MigrationInterface {
  name = 'AddProductFavorite1791650663248';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "isFavorite" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "isFavorite"`);
  }
}
