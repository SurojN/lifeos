import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { AuthorizationError } from "@/lib/security/errors";
import type { VersionedEncryption } from "@/lib/security/encryption";
import type { PrivateStorage } from "@/lib/storage/types";
import { documentUploadSchema } from "@/validation/documents";
import { resourceIdSchema } from "@/validation/common";

export class DocumentUploadService {
  constructor(private readonly database: PrismaClient, private readonly storage: PrivateStorage, private readonly encryption: VersionedEncryption) {}

  async authorize(userId: string, rawInput: unknown) {
    const input = documentUploadSchema.parse(rawInput);
    const authorization = await this.storage.createUploadAuthorization({ userId, originalFileName: input.originalFileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, checksum: input.checksum });
    const result = await this.database.$transaction(async transaction => {
      const document = await transaction.sourceDocument.create({ data: { userId, originalFileNameEncrypted: this.encryption.encrypt(input.originalFileName), storageKey: authorization.storageKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes, checksum: input.checksum, category: input.category, status: "PENDING_UPLOAD" } });
      const upload = await transaction.documentUpload.create({ data: { userId, sourceDocumentId: document.id, expectedMimeType: input.mimeType, expectedSizeBytes: input.sizeBytes, expectedChecksum: input.checksum, status: "AUTHORIZED", expiresAt: authorization.expiresAt } });
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "document_upload.authorize", resourceType: "DocumentUpload", resourceId: upload.id, result: "SUCCESS", metadata: {} } });
      return { documentId: document.id, uploadId: upload.id };
    });
    return { ...result, uploadUrl: authorization.uploadUrl, expiresAt: authorization.expiresAt, requiredHeaders: authorization.requiredHeaders };
  }

  async confirm(userId: string, rawUploadId: string) {
    const uploadId = resourceIdSchema.parse(rawUploadId);
    const upload = await this.database.documentUpload.findFirst({ where: { id: uploadId, userId }, include: { sourceDocument: true } });
    if (!upload || upload.status !== "AUTHORIZED") return this.deny(userId, uploadId, "upload_not_authorized");
    if (upload.expiresAt <= new Date()) {
      await this.database.$transaction(async transaction => {
        await transaction.documentUpload.updateMany({ where: { id: uploadId, userId, status: "AUTHORIZED" }, data: { status: "EXPIRED" } });
        await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "document_upload.confirm", resourceType: "DocumentUpload", resourceId: uploadId, result: "DENIED", metadata: { reason: "expired" } } });
      });
      throw new AuthorizationError();
    }
    await this.storage.confirmUpload({ userId, storageKey: upload.sourceDocument.storageKey, expectedSizeBytes: upload.expectedSizeBytes, expectedChecksum: upload.expectedChecksum });
    await this.database.$transaction(async transaction => {
      const updated = await transaction.documentUpload.updateMany({ where: { id: uploadId, userId, status: "AUTHORIZED" }, data: { status: "VERIFIED", completedAt: new Date() } });
      if (updated.count !== 1) throw new AuthorizationError();
      await transaction.sourceDocument.update({ where: { id_userId: { id: upload.sourceDocumentId, userId } }, data: { status: "QUARANTINED", uploadedAt: new Date() } });
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "document_upload.confirm", resourceType: "DocumentUpload", resourceId: uploadId, result: "SUCCESS", metadata: {} } });
    });
    return { documentId: upload.sourceDocumentId, status: "QUARANTINED" as const };
  }

  private async deny(userId: string, uploadId: string, reason: string): Promise<never> {
    await this.database.auditLog.create({ data: { userId, actorUserId: userId, action: "document_upload.confirm", resourceType: "DocumentUpload", resourceId: uploadId, result: "DENIED", metadata: { reason } } });
    throw new AuthorizationError();
  }
}
