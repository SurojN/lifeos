import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { S3CompatiblePrivateStorage } from "./s3-compatible";

export function createS3Storage(input: { endpoint?: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; kmsKeyId: string }) {
  const client = new S3Client({ endpoint: input.endpoint, region: input.region, forcePathStyle: false, credentials: { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey } });
  return new S3CompatiblePrivateStorage(client, input.bucket, input.kmsKeyId);
}
