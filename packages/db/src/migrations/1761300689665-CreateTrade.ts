import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTrade1761300689665 implements MigrationInterface {
    name = 'CreateTrade1761300689665'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trade" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "state" character varying NOT NULL, "ratio_target" double precision NOT NULL, "ratio_last" double precision, "size" double precision NOT NULL, "result" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4097908741dc408f8274ebdc53" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "trade"`);
    }

}
