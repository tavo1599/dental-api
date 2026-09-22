import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ============================================================================
 * BACKFILL: sede principal para las clinicas que ya existen
 *
 * Objetivo: que al introducir sucursales NADA cambie para quien ya usa el
 * sistema. Cada clinica pasa a tener una "Sede Principal" que hereda sus datos
 * de contacto, y todos sus usuarios quedan asignados a ella.
 *
 * Es idempotente a proposito (los INSERT comprueban que no exista ya), para
 * poder correrla sin miedo si un despliegue se queda a medias.
 *
 * NO toca ninguna fila existente: solo inserta. Los datos de clinicas,
 * pacientes, citas y presupuestos quedan exactamente igual.
 * ============================================================================
 */
export class BackfillMainBranch1790021345455 implements MigrationInterface {
  name = 'BackfillMainBranch1790021345455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Una sede principal por clinica, heredando sus datos de contacto.
    //    Solo para las clinicas que todavia no tengan ninguna sede.
    await queryRunner.query(`
      INSERT INTO "branches"
        ("id", "name", "isMain", "isActive", "address", "phone", "email", "tenantId")
      SELECT
        uuid_generate_v4(), 'Sede Principal', true, true,
        t."address", t."phone", t."email", t."id"
      FROM "tenants" t
      WHERE NOT EXISTS (
        SELECT 1 FROM "branches" b WHERE b."tenantId" = t."id"
      )
    `);

    // 2. Todos los usuarios de cada clinica quedan asignados a su sede
    //    principal. Se excluyen los super admin (tenantId NULL), que no
    //    pertenecen a ninguna clinica.
    await queryRunner.query(`
      INSERT INTO "user_branches" ("userId", "branchId")
      SELECT u."id", b."id"
      FROM "users" u
      JOIN "branches" b
        ON b."tenantId" = u."tenantId" AND b."isMain" = true
      WHERE u."tenantId" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
  }

  /**
   * Deshace exactamente lo que inserto up(): las asignaciones a sedes
   * principales y esas sedes. No toca sedes creadas a mano despues.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "user_branches"
      WHERE "branchId" IN (SELECT "id" FROM "branches" WHERE "isMain" = true)
    `);
    await queryRunner.query(`
      DELETE FROM "branches" WHERE "isMain" = true AND "name" = 'Sede Principal'
    `);
  }
}
