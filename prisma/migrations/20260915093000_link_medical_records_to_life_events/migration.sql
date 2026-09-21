ALTER TABLE "LifeEvent" ADD COLUMN "medicalRecordId" TEXT;

CREATE UNIQUE INDEX "LifeEvent_medicalRecordId_userId_key" ON "LifeEvent"("medicalRecordId", "userId");

ALTER TABLE "LifeEvent"
ADD CONSTRAINT "LifeEvent_medicalRecordId_userId_fkey"
FOREIGN KEY ("medicalRecordId", "userId")
REFERENCES "MedicalRecord"("id", "userId")
ON DELETE RESTRICT ON UPDATE CASCADE;
