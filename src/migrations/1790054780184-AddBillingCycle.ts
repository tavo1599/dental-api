import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ============================================================================
 * CICLO DE COBRO
 *
 * Añade el dia de cobro y la marca del ultimo aviso enviado.
 *
 * Sobre el relleno de "billingDay": se saca del "nextPaymentDate" que ya
 * tiene cada clinica, NO de su fecha de alta. Son dos dias distintos en los
 * datos reales (hay clinicas dadas de alta un 18 que hoy cobran el 21), y el
 * que el cliente conoce y tiene apuntado es el del proximo pago. Sacarlo del
 * alta les moveria la fecha sin avisar.
 *
 * Consecuencia a tener presente: a una clinica cuya fecha ya se corrio por el
 * desbordamiento del mes (el 31 de enero se convertia en el 3 de marzo), este
 * relleno le deja el dia corrido. No hay forma de adivinar cual era el
 * original, asi que se respeta lo que esta cobrandose hoy. Si se sabe cual
 * era, se corrige a mano en esa clinica.
 * ============================================================================
 */
export class AddBillingCycle1790054780184 implements MigrationInterface {
  name = 'AddBillingCycle1790054780184';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS a proposito: Dokploy despliega solo al hacer push, asi que
    // el contenedor nuevo arranca ANTES de que se pueda correr la migracion y
    // la entidad ya pide estas columnas. Con esto se pueden aplicar a mano en
    // la base antes de subir el codigo (son columnas nuevas y nulables, el
    // codigo viejo ni las mira) y despues correr la migracion, que se limita a
    // dejar constancia. Sin esto hay una ventana con la API caida.
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "billingDay" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "lastPaymentNoticeAt" date`,
    );

    await queryRunner.query(`
      UPDATE "tenants"
      SET "billingDay" = EXTRACT(DAY FROM "nextPaymentDate")::int
      WHERE "nextPaymentDate" IS NOT NULL
        AND "billingDay" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "lastPaymentNoticeAt"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "billingDay"`);
  }
}
