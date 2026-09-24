import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { generateStorageKey, assertUserScopedStorageKey } from "@/lib/storage/keys";
import { S3CompatiblePrivateStorage } from "@/lib/storage/s3-compatible";
import { S3Client } from "@aws-sdk/client-s3";

const userId = "clh1234567890abcdefghijklm";

describe("private storage boundaries", () => {
  it("verifies downloaded bytes instead of trusting client-supplied checksum metadata", async () => {
    const bytes = Buffer.from("%PDF-1.7 synthetic");
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const client = new S3Client({ region: "us-east-1" });
    const send = vi.spyOn(client, "send");
    send.mockResolvedValueOnce({ ContentLength: bytes.length, ContentType: "application/pdf", ETag: '"version"', Metadata: { sha256: checksum } } as never);
    send.mockResolvedValueOnce({ Body: Readable.from([bytes]) } as never);
    const storage = new S3CompatiblePrivateStorage(client, "private-bucket");
    const input = { userId, storageKey: `users/${userId}/documents/test.pdf`, expectedMimeType: "application/pdf", expectedSizeBytes: bytes.length, expectedChecksum: checksum };
    await expect(storage.confirmUpload(input)).resolves.toMatchObject({ checksum });
    expect(send.mock.calls[1][0].input).toMatchObject({ IfMatch: '"version"' });

    send.mockResolvedValueOnce({ ContentLength: bytes.length, ContentType: "application/pdf", Metadata: { sha256: checksum } } as never);
    send.mockResolvedValueOnce({ Body: Readable.from([Buffer.alloc(bytes.length)]) } as never);
    await expect(storage.confirmUpload(input)).rejects.toThrow("verification failed");
  });

  it("rejects storage MIME mismatches before downloading content", async () => {
    const client = new S3Client({ region: "us-east-1" });
    const send = vi.spyOn(client, "send").mockResolvedValueOnce({ ContentLength: 10, ContentType: "text/html" } as never);
    const storage = new S3CompatiblePrivateStorage(client, "private-bucket");
    await expect(storage.confirmUpload({ userId, storageKey: `users/${userId}/documents/test.pdf`, expectedMimeType: "application/pdf", expectedSizeBytes: 10, expectedChecksum: "a".repeat(64) })).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("generates user-scoped keys and ignores arbitrary path content", () => {
    expect(generateStorageKey(userId, "../../private/report.pdf", () => "generated-id")).toBe(`users/${userId}/documents/generated-id.pdf`);
  });

  it("rejects keys outside the authenticated user's prefix", () => {
    expect(() => assertUserScopedStorageKey(userId, "users/other/documents/file.pdf")).toThrow("Storage object not found");
  });

  it("creates a short-lived private PUT authorization with fixed headers", async () => {
    const client = new S3Client({ region: "us-east-1", endpoint: "http://127.0.0.1:9000", forcePathStyle: true, credentials: { accessKeyId: "test", secretAccessKey: "test-secret" } });
    const storage = new S3CompatiblePrivateStorage(client, "private-bucket");
    const authorization = await storage.createUploadAuthorization({ userId, originalFileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 10, checksum: "a".repeat(64) });
    expect(authorization.uploadUrl).toContain("X-Amz-Signature");
    expect(authorization.requiredHeaders["content-type"]).toBe("application/pdf");
    expect(authorization.requiredHeaders).not.toHaveProperty("x-amz-acl");
    expect(authorization.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(600_000);
  });

  it("requires SSE-KMS headers for production S3 authorization", async () => {
    const client = new S3Client({ region: "us-east-1", credentials: { accessKeyId: "test", secretAccessKey: "test-secret" } });
    const storage = new S3CompatiblePrivateStorage(client, "private-bucket", "kms-key-id");
    const authorization = await storage.createUploadAuthorization({ userId, originalFileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 10, checksum: "a".repeat(64) });
    expect(authorization.requiredHeaders["x-amz-server-side-encryption"]).toBe("aws:kms");
    expect(authorization.requiredHeaders["x-amz-server-side-encryption-aws-kms-key-id"]).toBe("kms-key-id");
  });

  it("authorizes non-medical section uploads through the same private storage boundary", async () => {
    const client = new S3Client({ region: "us-east-1", endpoint: "http://127.0.0.1:9000", forcePathStyle: true, credentials: { accessKeyId: "test", secretAccessKey: "test-secret" } });
    const storage = new S3CompatiblePrivateStorage(client, "private-bucket");
    await expect(storage.createUploadAuthorization({ userId, originalFileName: "itinerary.pdf", mimeType: "application/pdf", sizeBytes: 10, checksum: "b".repeat(64) })).resolves.toMatchObject({ requiredHeaders: { "content-type": "application/pdf" } });
  });
});
