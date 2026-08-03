import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { S3CompatiblePrivateStorage } from "./s3-compatible";

export function createMinioStorage(input: { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string }) {
  const client = new S3Client({ endpoint: input.endpoint, region: input.region, forcePathStyle: true, credentials: { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey } });
  return new S3CompatiblePrivateStorage(client, input.bucket);
}
