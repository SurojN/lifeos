import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { documentUploadSchema } from "@/validation/documents";
import { assertUserScopedStorageKey, generateStorageKey } from "./keys";
import type { PrivateStorage, UploadInput } from "./types";
import { readDocumentBytes, verifyDocumentBytes } from "./document-content";

export class S3CompatiblePrivateStorage implements PrivateStorage {
  constructor(private readonly client: S3Client, private readonly bucket: string, private readonly kmsKeyId?: string) {}

  async createUploadAuthorization(input: UploadInput) {
    documentUploadSchema.parse({ originalFileName: input.originalFileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, checksum: input.checksum, category: "GENERAL" });
    const storageKey = generateStorageKey(input.userId, input.originalFileName);
    const checksumBase64 = Buffer.from(input.checksum, "hex").toString("base64");
    const requiredHeaders: Record<string, string> = { "content-type": input.mimeType, "content-length": String(input.sizeBytes), "x-amz-checksum-sha256": checksumBase64, "x-amz-meta-sha256": input.checksum };
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, ContentType: input.mimeType, ContentLength: input.sizeBytes, ChecksumSHA256: checksumBase64, Metadata: { sha256: input.checksum }, ...(this.kmsKeyId ? { ServerSideEncryption: "aws:kms", SSEKMSKeyId: this.kmsKeyId } : {}) });
    if (this.kmsKeyId) { requiredHeaders["x-amz-server-side-encryption"] = "aws:kms"; requiredHeaders["x-amz-server-side-encryption-aws-kms-key-id"] = this.kmsKeyId; }
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    return { storageKey, uploadUrl: await getSignedUrl(this.client, command, { expiresIn: 600 }), expiresAt, requiredHeaders };
  }

  async confirmUpload(input: { userId: string; storageKey: string; expectedSizeBytes: number; expectedChecksum: string; expectedMimeType: string }) {
    assertUserScopedStorageKey(input.userId, input.storageKey);
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: input.storageKey, ChecksumMode: "ENABLED" }));
    if (result.ContentLength !== input.expectedSizeBytes || result.ContentType !== input.expectedMimeType) throw new Error("Uploaded object verification failed.");
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: input.storageKey, IfMatch: result.ETag }));
    const bytes = await readDocumentBytes(object.Body, input.expectedSizeBytes);
    if (bytes.byteLength !== input.expectedSizeBytes) throw new Error("Uploaded object verification failed.");
    verifyDocumentBytes(bytes, input.expectedMimeType, input.expectedChecksum);
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
