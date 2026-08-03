import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { documentUploadSchema } from "@/validation/documents";
import { assertUserScopedStorageKey, generateStorageKey } from "./keys";
import type { PrivateStorage, UploadInput } from "./types";

export class S3CompatiblePrivateStorage implements PrivateStorage {
  constructor(private readonly client: S3Client, private readonly bucket: string) {}

  async createUploadAuthorization(input: UploadInput) {
    documentUploadSchema.parse({ originalFileName: input.originalFileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, checksum: input.checksum, category: "HEALTH" });
    return { storageKey: generateStorageKey(input.userId, input.originalFileName), expiresAt: new Date(Date.now() + 10 * 60_000) };
  }

  async confirmUpload(input: { userId: string; storageKey: string; expectedSizeBytes: number; expectedChecksum: string }) {
    assertUserScopedStorageKey(input.userId, input.storageKey);
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: input.storageKey }));
    if (result.ContentLength !== input.expectedSizeBytes || result.Metadata?.sha256 !== input.expectedChecksum) throw new Error("Uploaded object verification failed.");
    return { storageKey: input.storageKey, sizeBytes: input.expectedSizeBytes, checksum: input.expectedChecksum };
  }

  async getPrivateObject(input: { userId: string; storageKey: string }) {
    assertUserScopedStorageKey(input.userId, input.storageKey);
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: input.storageKey }));
    return { body: result.Body, mimeType: result.ContentType ?? "application/octet-stream", sizeBytes: result.ContentLength ?? 0 };
  }

  async deletePrivateObject(input: { userId: string; storageKey: string }) {
    assertUserScopedStorageKey(input.userId, input.storageKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: input.storageKey }));
  }
}
