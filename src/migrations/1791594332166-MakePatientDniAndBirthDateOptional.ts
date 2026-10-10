import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DNI y fecha de nacimiento dejan de ser obligatorios.
 *
 * En recepcion se agenda a quien llama por telefono con lo poco que da: su
 * nombre y un celular. Exigir DNI y fecha de nacimiento ahi obligaba a
 * inventarselos -y un DNI inventado es peor que ninguno, porque luego nadie
 * sabe cual es el de verdad-. Ahora se puede dar de alta con lo minimo y
 * completar la ficha cuando el paciente llega.
 *
 * La restriccion UNIQUE (dni, tenantId) se queda como esta: Postgres considera
 * cada NULL distinto de los demas, asi que puede haber muchos pacientes sin
 * DNI y sigue siendo imposible repetir uno que si este puesto.
 */
export class MakePatientDniAndBirthDateOptional1791594332166
  implements MigrationInterface
{
  name = 'MakePatientDniAndBirthDateOptional1791594332166';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "dni" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "birthDate" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo se puede volver atras si no quedo ninguna ficha incompleta; si
    // quedo, hay que completarla antes y esto falla a proposito en lugar de
    // inventar datos.
    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "birthDate" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "dni" SET NOT NULL`);
  }
}
