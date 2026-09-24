import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { VersionedEncryption } from "@/lib/security/encryption";
import { DocumentUploadService } from "@/services/document-uploads";
import { AuthorizationError, UploadStillActiveError } from "@/lib/security/errors";
import type { PrivateStorage } from "@/lib/storage/types";

const userId = "clh1234567890abcdefghijklm";
const documentId = "clh1234567890abcdefghijklmn";
const uploadId = "clh1234567890abcdefghijklo";
const storageKey = `users/${userId}/documents/report.pdf`;
const encryption = new VersionedEncryption(`v1:${randomBytes(32).toString("base64")}`);
const findDocument = vi.fn();
const findUpload = vi.fn();
const updateDocument = vi.fn();
const updateUpload = vi.fn();
const audit = vi.fn();
const deleteObject = vi.fn();
const confirmUpload = vi.fn();
const transaction = { sourceDocument: { updateMany: updateDocument }, documentUpload: { updateMany: updateUpload }, auditLog: { create: audit } };
const database = { sourceDocument: { findFirst: findDocument }, documentUpload: { findFirst: findUpload }, auditLog: { create: audit }, $transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) } as unknown as PrismaClient;
const service = new DocumentUploadService(database, { deletePrivateObject: deleteObject, confirmUpload } as unknown as PrivateStorage, encryption);

beforeEach(() => {
  vi.resetAllMocks();
  findDocument.mockResolvedValue({ id: documentId, storageKey, status: "PENDING_UPLOAD" });
  findUpload.mockResolvedValue(null);
  updateDocument.mockResolvedValue({ count: 1 });
  updateUpload.mockResolvedValue({ count: 1 });
});

describe("document upload lifecycle", () => {
  it("erases unconfirmed objects and invalidates their upload records", async () => {
    await expect(service.delete(userId, documentId)).resolves.toMatchObject({ status: "DELETED" });
    expect(deleteObject).toHaveBeenCalledWith({ userId, storageKey });
    expect(updateUpload).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "EXPIRED" } }));
  });

  it("does not claim erasure while a signed PUT can recreate the object", async () => {
    findUpload.mockResolvedValue({ id: uploadId });
    await expect(service.delete(userId, documentId)).rejects.toBeInstanceOf(UploadStillActiveError);
    expect(deleteObject).not.toHaveBeenCalled();
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it("leaves deletion retryable after storage failure", async () => {
    deleteObject.mockRejectedValue(new Error("storage unavailable"));
    await expect(service.delete(userId, documentId)).rejects.toThrow();
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it("does not touch storage for a foreign document and audits the correct action", async () => {
    findDocument.mockResolvedValue(null);
    await expect(service.delete(userId, documentId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(deleteObject).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "source_document.delete", resourceType: "SourceDocument", result: "DENIED" }) }));
  });

  it("refuses to confirm a deleted source", async () => {
    findUpload.mockResolvedValue({ status: "AUTHORIZED", sourceDocument: { status: "DELETED", deletedAt: new Date() } });
    await expect(service.confirm(userId, uploadId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(confirmUpload).not.toHaveBeenCalled();
  });

  it("refuses to restore a source deleted during storage verification", async () => {
    findUpload.mockResolvedValue({ status: "AUTHORIZED", expiresAt: new Date(Date.now() + 60_000), sourceDocumentId: documentId, expectedMimeType: "application/pdf", expectedChecksum: "a".repeat(64), expectedSizeBytes: 10, sourceDocument: { status: "PENDING_UPLOAD", deletedAt: null, storageKey } });
    updateDocument.mockResolvedValue({ count: 0 });
    await expect(service.confirm(userId, uploadId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(updateDocument).toHaveBeenCalledWith(expect.objectContaining({ where: { id: documentId, userId, deletedAt: null, status: "PENDING_UPLOAD" } }));
    expect(audit).not.toHaveBeenCalled();
  });
});
