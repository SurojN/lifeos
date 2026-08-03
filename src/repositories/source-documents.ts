import "server-only";
import { getDatabase } from "@/lib/db/client";

export function findSourceDocumentForUser(userId: string, documentId: string) {
  return getDatabase().sourceDocument.findFirst({
    where: { id: documentId, userId, deletedAt: null },
    select: { id: true, originalFileName: true, mimeType: true, sizeBytes: true, category: true, status: true, verificationStatus: true, uploadedAt: true },
  });
}

export function listSourceDocumentsForUser(userId: string) {
  return getDatabase().sourceDocument.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, originalFileName: true, mimeType: true, sizeBytes: true, category: true, status: true, verificationStatus: true, uploadedAt: true },
    orderBy: { createdAt: "desc" },
  });
}
