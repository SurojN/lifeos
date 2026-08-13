import "server-only";
import { getDatabase } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { getApplicationEncryption } from "@/lib/security/encryption";

export async function listMedicalRecordsForUser(userId: string) {
  const records = await getDatabase().medicalRecord.findMany({ where: { userId, deletedAt: null }, orderBy: { eventDate: "desc" } });
  const encryption = getApplicationEncryption();
  await getDatabase().auditLog.create({ data: { userId, actorUserId: userId, action: "medical_record.list", resourceType: "MedicalRecord", result: "SUCCESS", metadata: {} } });
  return records.map(({ titleEncrypted, summaryEncrypted, providerNameEncrypted, structuredDataEncrypted, ...record }) => ({ ...record, title: encryption.decrypt(titleEncrypted), summary: summaryEncrypted ? encryption.decrypt(summaryEncrypted) : null, providerName: providerNameEncrypted ? encryption.decrypt(providerNameEncrypted) : null, structuredData: encryption.decryptJson(structuredDataEncrypted) }));
}

export function createMedicalRecordForUser(userId: string, input: { sourceDocumentId: string; recordType: string; eventDate: Date; providerName?: string; title: string; summary?: string; structuredData: unknown }) {
  const encryption = getApplicationEncryption();
  return getDatabase().$transaction(async transaction => {
    const record = await transaction.medicalRecord.create({ data: { userId, sourceDocumentId: input.sourceDocumentId, recordType: input.recordType, eventDate: input.eventDate, providerNameEncrypted: input.providerName ? encryption.encrypt(input.providerName) : null, titleEncrypted: encryption.encrypt(input.title), summaryEncrypted: input.summary ? encryption.encrypt(input.summary) : null, structuredDataEncrypted: encryption.encryptJson(input.structuredData) } });
    await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "medical_record.create", resourceType: "MedicalRecord", resourceId: record.id, result: "SUCCESS", metadata: {} } });
    return record;
  });
}

export function updateMedicalRecordForUser(userId: string, recordId: string, input: { title?: string; summary?: string | null; providerName?: string | null; eventDate?: Date }) {
  const encryption = getApplicationEncryption();
  const data: Prisma.MedicalRecordUpdateManyMutationInput = {
    ...(input.title ? { titleEncrypted: encryption.encrypt(input.title) } : {}),
    ...(input.summary === null ? { summaryEncrypted: null } : input.summary ? { summaryEncrypted: encryption.encrypt(input.summary) } : {}),
    ...(input.providerName === null ? { providerNameEncrypted: null } : input.providerName ? { providerNameEncrypted: encryption.encrypt(input.providerName) } : {}),
    ...(input.eventDate ? { eventDate: input.eventDate } : {}),
  };
  return getDatabase().$transaction(async transaction => {
    const result = await transaction.medicalRecord.updateMany({ where: { id: recordId, userId, deletedAt: null }, data });
    await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "medical_record.update", resourceType: "MedicalRecord", resourceId: recordId, result: result.count === 1 ? "SUCCESS" : "DENIED", metadata: {} } });
    return result;
  });
}
