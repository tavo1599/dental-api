import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBranchesFeatureFlag1790049990709 implements MigrationInterface {
    name = 'AddBranchesFeatureFlag1790049990709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" ADD "branchesEnabled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "branchesEnabled"`);
    }

}
