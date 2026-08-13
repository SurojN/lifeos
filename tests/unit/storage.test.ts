import { describe, expect, it } from "vitest";
import { generateStorageKey, assertUserScopedStorageKey } from "@/lib/storage/keys";
import { S3CompatiblePrivateStorage } from "@/lib/storage/s3-compatible";
import { S3Client } from "@aws-sdk/client-s3";

const userId = "clh1234567890abcdefghijklm";

describe("private storage boundaries", () => {
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
});
