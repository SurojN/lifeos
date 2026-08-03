import { describe, expect, it } from "vitest";
import { generateStorageKey, assertUserScopedStorageKey } from "@/lib/storage/keys";
import { S3CompatiblePrivateStorage } from "@/lib/storage/s3-compatible";

const userId = "clh1234567890abcdefghijklm";

describe("private storage boundaries", () => {
  it("generates user-scoped keys and ignores arbitrary path content", () => {
    expect(generateStorageKey(userId, "../../private/report.pdf", () => "generated-id")).toBe(`users/${userId}/documents/generated-id.pdf`);
  });

  it("rejects keys outside the authenticated user's prefix", () => {
    expect(() => assertUserScopedStorageKey(userId, "users/other/documents/file.pdf")).toThrow("Storage object not found");
  });

  it("does not create a public URL or public ACL", async () => {
    const calls: unknown[] = [];
    const client = { send: async (command: unknown) => { calls.push(command); return {}; } };
    const storage = new S3CompatiblePrivateStorage(client as never, "private-bucket");
    const authorization = await storage.createUploadAuthorization({ userId, originalFileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 10, checksum: "a".repeat(64) });
    expect(Object.keys(authorization).sort()).toEqual(["expiresAt", "storageKey"]);
    expect(calls).toHaveLength(0);
  });
});
