import "server-only";
import { getDatabase } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";

export function listMedicalRecordsForUser(userId: string) {
  return getDatabase().medicalRecord.findMany({ where: { userId, deletedAt: null }, orderBy: { eventDate: "desc" } });
}

export function updateMedicalRecordForUser(userId: string, recordId: string, input: Prisma.MedicalRecordUpdateManyMutationInput) {
  return getDatabase().medicalRecord.updateMany({ where: { id: recordId, userId, deletedAt: null }, data: input });
}
