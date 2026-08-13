import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse } from "@/lib/security/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireInternalUser();
    const database = getDatabase();
    const [documents, medicalRecords, lifeEvents, consentRecords] = await Promise.all([
      database.sourceDocument.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "asc" } }),
      database.medicalRecord.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { eventDate: "asc" } }),
      database.lifeEvent.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { occurredAt: "asc" } }),
      database.consentRecord.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    ]);
    const encryption = getApplicationEncryption();
    const payload = {
      format: "lifeos-export-v1", exportedAt: new Date().toISOString(),
      documents: documents.map((document) => ({ id: document.id, category: document.category, mimeType: document.mimeType, sizeBytes: document.sizeBytes, checksum: document.checksum, status: document.status, verificationStatus: document.verificationStatus, uploadedAt: document.uploadedAt, createdAt: document.createdAt, updatedAt: document.updatedAt, originalFileName: encryption.decrypt(document.originalFileNameEncrypted), note: "Download original bytes separately from Documents." })),
      medicalRecords: medicalRecords.map(({ titleEncrypted, summaryEncrypted, providerNameEncrypted, structuredDataEncrypted, ...item }) => ({ ...item, title: encryption.decrypt(titleEncrypted), summary: summaryEncrypted ? encryption.decrypt(summaryEncrypted) : null, providerName: providerNameEncrypted ? encryption.decrypt(providerNameEncrypted) : null, structuredData: encryption.decryptJson(structuredDataEncrypted) })),
      lifeEvents: lifeEvents.map(({ titleEncrypted, descriptionEncrypted, metadataEncrypted, ...item }) => ({ ...item, title: encryption.decrypt(titleEncrypted), description: descriptionEncrypted ? encryption.decrypt(descriptionEncrypted) : null, metadata: encryption.decryptJson(metadataEncrypted) })),
      consentRecords,
    };
    await database.auditLog.create({ data: { userId: user.id, actorUserId: user.id, action: "personal_data.export", resourceType: "User", resourceId: user.id, result: "SUCCESS", metadata: {} } });
    return Response.json(payload, { headers: { "content-disposition": `attachment; filename="lifeos-export-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "private, no-store" } });
  } catch (error) { return safeErrorResponse(error); }
}
