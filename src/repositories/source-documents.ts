import "server-only";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { AuthorizationError } from "@/lib/security/errors";

export async function findSourceDocumentForUser(userId: string, documentId: string) {
  const document = await getDatabase().sourceDocument.findFirst({
    where: { id: documentId, userId, deletedAt: null },
    select: { id: true, originalFileNameEncrypted: true, mimeType: true, sizeBytes: true, category: true, status: true, verificationStatus: true, uploadedAt: true },
  });
  if (!document) {
    await getDatabase().auditLog.create({ data: { userId, actorUserId: userId, action: "source_document.read", resourceType: "SourceDocument", resourceId: documentId, result: "DENIED", metadata: {} } });
    throw new AuthorizationError();
  }
  await getDatabase().auditLog.create({ data: { userId, actorUserId: userId, action: "source_document.read", resourceType: "SourceDocument", resourceId: documentId, result: "SUCCESS", metadata: {} } });
  const { originalFileNameEncrypted, ...operational } = document;
  return { ...operational, originalFileName: getApplicationEncryption().decrypt(originalFileNameEncrypted) };
}

export async function listSourceDocumentsForUser(userId: string) {
  const documents = await getDatabase().sourceDocument.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, originalFileNameEncrypted: true, mimeType: true, sizeBytes: true, category: true, status: true, verificationStatus: true, uploadedAt: true },
    orderBy: { createdAt: "desc" },
  });
  const encryption = getApplicationEncryption();
  await getDatabase().auditLog.create({ data: { userId, actorUserId: userId, action: "source_document.list", resourceType: "SourceDocument", result: "SUCCESS", metadata: {} } });
  return documents.map(({ originalFileNameEncrypted, ...document }) => ({ ...document, originalFileName: encryption.decrypt(originalFileNameEncrypted) }));
}
