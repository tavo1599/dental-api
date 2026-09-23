import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ============================================================================
 * ANAMNESIS DE PSICOLOGIA Y ESTETICA
 *
 * Dos tablas nuevas, una por rubro. NO se toca ninguna tabla existente: no
 * hay ALTER sobre patients ni sobre medical_histories, asi que no hay forma
 * de que esto afecte a lo que ya funciona.
 *
 * Por eso tampoco hace falta aplicarla antes del despliegue, a diferencia de
 * las dos anteriores: ninguna consulta existente pide estas columnas. Lo
 * unico que no funcionaria hasta correrla son los endpoints nuevos, y esos
 * solo los alcanzan las clinicas de psicologia o estetica.
 *
 * El diseno es el mismo que el de ortodoncia y odontopediatria: la anamnesis
 * GENERAL (medical_histories) es comun a los tres rubros -motivo de consulta,
 * antecedentes, medicacion, alergias, signos vitales- y cada rubro anade
 * aparte lo suyo. No se duplica nada.
 * ============================================================================
 */

export class AddVerticalAnamnesis1790141925156 implements MigrationInterface {
    name = 'AddVerticalAnamnesis1790141925156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "psychology_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "hadPreviousTherapy" boolean NOT NULL DEFAULT false, "previousTherapyDetails" text, "previousDiagnoses" text, "psychiatricMedication" text, "hadPsychiatricHospitalization" boolean NOT NULL DEFAULT false, "familyMentalHealthHistory" text, "occupationalSituation" text, "supportNetwork" text, "currentStressors" text, "sleepPattern" text, "substanceUse" text, "hasSuicidalIdeation" boolean NOT NULL DEFAULT false, "hasPreviousAttempts" boolean NOT NULL DEFAULT false, "hasSelfHarm" boolean NOT NULL DEFAULT false, "riskNotes" text, "expectations" text, "treatmentPlan" text, "patientId" uuid, CONSTRAINT "REL_8e6a5c2bb10c39fdf66881fdf0" UNIQUE ("patientId"), CONSTRAINT "PK_973be4d8c0586f498516fa9de47" PRIMARY KEY ("id")); COMMENT ON COLUMN "psychology_histories"."hadPreviousTherapy" IS '¿Ha recibido atención psicológica antes?'; COMMENT ON COLUMN "psychology_histories"."previousTherapyDetails" IS 'Dónde, cuándo y por cuánto tiempo'; COMMENT ON COLUMN "psychology_histories"."previousDiagnoses" IS 'Diagnósticos psicológicos o psiquiátricos previos'; COMMENT ON COLUMN "psychology_histories"."psychiatricMedication" IS 'Medicación psiquiátrica actual y quién la indicó'; COMMENT ON COLUMN "psychology_histories"."hadPsychiatricHospitalization" IS '¿Ha estado hospitalizado por salud mental?'; COMMENT ON COLUMN "psychology_histories"."familyMentalHealthHistory" IS 'Antecedentes de salud mental en la familia'; COMMENT ON COLUMN "psychology_histories"."occupationalSituation" IS 'Situación laboral o de estudios'; COMMENT ON COLUMN "psychology_histories"."supportNetwork" IS 'Con quién vive y cómo es su red de apoyo'; COMMENT ON COLUMN "psychology_histories"."currentStressors" IS 'Situaciones estresantes actuales'; COMMENT ON COLUMN "psychology_histories"."sleepPattern" IS 'Calidad del sueño y horarios'; COMMENT ON COLUMN "psychology_histories"."substanceUse" IS 'Consumo de alcohol, tabaco u otras sustancias'; COMMENT ON COLUMN "psychology_histories"."hasSuicidalIdeation" IS '¿Presenta ideación suicida?'; COMMENT ON COLUMN "psychology_histories"."hasPreviousAttempts" IS '¿Hay intentos previos?'; COMMENT ON COLUMN "psychology_histories"."hasSelfHarm" IS '¿Presenta conductas autolesivas?'; COMMENT ON COLUMN "psychology_histories"."riskNotes" IS 'Detalle de la evaluación de riesgo y plan de seguridad'; COMMENT ON COLUMN "psychology_histories"."expectations" IS 'Qué espera el paciente del proceso'; COMMENT ON COLUMN "psychology_histories"."treatmentPlan" IS 'Impresión diagnóstica y plan de trabajo'`);
        await queryRunner.query(`CREATE TABLE "aesthetic_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "skinPhototype" character varying(5), "skinType" text, "currentConditions" text, "currentSkincare" text, "previousTreatments" text, "previousFillers" text, "previousSurgeries" text, "keloidTendency" boolean NOT NULL DEFAULT false, "recurrentHerpes" boolean NOT NULL DEFAULT false, "usesIsotretinoin" boolean NOT NULL DEFAULT false, "usesRetinoids" boolean NOT NULL DEFAULT false, "recentSunExposure" boolean NOT NULL DEFAULT false, "usesSunscreen" boolean NOT NULL DEFAULT false, "hasMetalImplants" boolean NOT NULL DEFAULT false, "otherContraindications" text, "expectations" text, "treatmentPlan" text, "patientId" uuid, CONSTRAINT "REL_896d9efd3d7bf3948b7c90b4e6" UNIQUE ("patientId"), CONSTRAINT "PK_cdd0b9f779f33f1f443543b65f4" PRIMARY KEY ("id")); COMMENT ON COLUMN "aesthetic_histories"."skinPhototype" IS 'Fototipo de Fitzpatrick (I a VI)'; COMMENT ON COLUMN "aesthetic_histories"."skinType" IS 'Tipo de piel: grasa, seca, mixta, sensible'; COMMENT ON COLUMN "aesthetic_histories"."currentConditions" IS 'Afecciones actuales: acné, rosácea, melasma...'; COMMENT ON COLUMN "aesthetic_histories"."currentSkincare" IS 'Rutina de cuidado que sigue hoy'; COMMENT ON COLUMN "aesthetic_histories"."previousTreatments" IS 'Tratamientos estéticos previos y cuándo'; COMMENT ON COLUMN "aesthetic_histories"."previousFillers" IS 'Rellenos, toxina botulínica o implantes, y zonas'; COMMENT ON COLUMN "aesthetic_histories"."previousSurgeries" IS 'Cirugías estéticas previas'; COMMENT ON COLUMN "aesthetic_histories"."keloidTendency" IS '¿Tendencia a queloides o cicatrización anómala?'; COMMENT ON COLUMN "aesthetic_histories"."recurrentHerpes" IS '¿Herpes labial recurrente?'; COMMENT ON COLUMN "aesthetic_histories"."usesIsotretinoin" IS '¿Usa isotretinoína o la usó en los últimos 6 meses?'; COMMENT ON COLUMN "aesthetic_histories"."usesRetinoids" IS '¿Usa retinoides o ácidos tópicos?'; COMMENT ON COLUMN "aesthetic_histories"."recentSunExposure" IS '¿Exposición solar intensa o bronceado reciente?'; COMMENT ON COLUMN "aesthetic_histories"."usesSunscreen" IS '¿Usa protector solar a diario?'; COMMENT ON COLUMN "aesthetic_histories"."hasMetalImplants" IS '¿Marcapasos o implantes metálicos? (radiofrecuencia)'; COMMENT ON COLUMN "aesthetic_histories"."otherContraindications" IS 'Otras contraindicaciones a tener en cuenta'; COMMENT ON COLUMN "aesthetic_histories"."expectations" IS 'Zonas a tratar y qué espera el paciente'; COMMENT ON COLUMN "aesthetic_histories"."treatmentPlan" IS 'Plan de tratamiento propuesto'`);
        await queryRunner.query(`ALTER TABLE "psychology_histories" ADD CONSTRAINT "FK_8e6a5c2bb10c39fdf66881fdf01" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "aesthetic_histories" ADD CONSTRAINT "FK_896d9efd3d7bf3948b7c90b4e68" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "aesthetic_histories" DROP CONSTRAINT "FK_896d9efd3d7bf3948b7c90b4e68"`);
        await queryRunner.query(`ALTER TABLE "psychology_histories" DROP CONSTRAINT "FK_8e6a5c2bb10c39fdf66881fdf01"`);
        await queryRunner.query(`DROP TABLE "aesthetic_histories"`);
        await queryRunner.query(`DROP TABLE "psychology_histories"`);
    }

}
