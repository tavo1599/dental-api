import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ============================================================================
 * CATEGORIAS DE PRODUCTO PARA TODOS LOS RUBROS
 *
 * Hasta ahora eran todas dentales (ortodoncia, restauracion, anestesicos), asi
 * que a un centro de estetica una crema o una punta de laser le caia en
 * "otros". Se anaden las que usa cada rubro de verdad:
 *
 *   estetica     cosmeticos, inyectables, aparatologia
 *   psicologia   material de evaluacion, material terapeutico, papeleria
 *
 * Los valores que ya existian NO se tocan ni se renombran: hay productos
 * guardados con ellos y perderian su categoria.
 *
 * Se hace por el camino de TypeORM -renombrar el tipo, crear el nuevo,
 * convertir la columna y borrar el viejo- y no con ALTER TYPE ADD VALUE,
 * porque este si funciona dentro de la transaccion de la migracion.
 *
 * OJO con revertirla: si alguna clinica ya guardo un producto con una
 * categoria nueva, el down() fallara al no poder convertirla de vuelta. Es el
 * comportamiento correcto -antes que perder el dato en silencio- pero conviene
 * saberlo.
 * ============================================================================
 */

export class AddVerticalProductCategories1790888945083 implements MigrationInterface {
    name = 'AddVerticalProductCategories1790888945083'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."products_category_enum" RENAME TO "products_category_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."products_category_enum" AS ENUM('higiene', 'descartables', 'instrumental', 'otros', 'ortodoncia', 'restauracion', 'anestesicos', 'cosmeticos', 'inyectables', 'aparatologia', 'material_evaluacion', 'material_terapeutico', 'papeleria')`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "category" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "category" TYPE "public"."products_category_enum" USING "category"::"text"::"public"."products_category_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "category" SET DEFAULT 'otros'`);
        await queryRunner.query(`DROP TYPE "public"."products_category_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."products_category_enum_old" AS ENUM('anestesicos', 'descartables', 'higiene', 'instrumental', 'ortodoncia', 'otros', 'restauracion')`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "category" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "category" TYPE "public"."products_category_enum_old" USING "category"::"text"::"public"."products_category_enum_old"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "category" SET DEFAULT 'otros'`);
        await queryRunner.query(`DROP TYPE "public"."products_category_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."products_category_enum_old" RENAME TO "products_category_enum"`);
    }

}
