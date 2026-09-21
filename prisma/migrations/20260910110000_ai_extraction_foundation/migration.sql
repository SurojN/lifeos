ALTER TABLE "ExtractionJob" ADD COLUMN "model" TEXT NOT NULL DEFAULT 'unconfigured';
ALTER TABLE "ExtractionJob" ADD COLUMN "consentRecordId" TEXT;
ALTER TABLE "ExtractionJob" ADD COLUMN "resultEncrypted" TEXT;

UPDATE "ExtractionJob"
SET "consentRecordId" = (
  SELECT "id" FROM "ConsentRecord"
  WHERE "ConsentRecord"."userId" = "ExtractionJob"."userId"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "consentRecordId" IS NULL;

INSERT INTO "ConsentRecord" ("id", "userId", "consentType", "policyVersion", "granted", "createdAt")
SELECT 'migration-' || "ExtractionJob"."id", "ExtractionJob"."userId", 'AI_MEDICAL_EXTRACTION', 'migration', false, CURRENT_TIMESTAMP
FROM "ExtractionJob"
WHERE "consentRecordId" IS NULL;

UPDATE "ExtractionJob"
SET "consentRecordId" = 'migration-' || "id"
WHERE "consentRecordId" IS NULL;

ALTER TABLE "ExtractionJob" ALTER COLUMN "consentRecordId" SET NOT NULL;
ALTER TABLE "ExtractionJob" ADD CONSTRAINT "ExtractionJob_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "ConsentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
