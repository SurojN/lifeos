import "server-only";
import { getServerEnvironment } from "@/lib/env/server";
import { createMinioStorage } from "./minio";
import { createS3Storage } from "./s3";
import type { PrivateStorage } from "./types";

export function createPrivateStorage(): PrivateStorage {
  const environment = getServerEnvironment();
  const common = { region: environment.S3_REGION, bucket: environment.S3_BUCKET, accessKeyId: environment.S3_ACCESS_KEY_ID, secretAccessKey: environment.S3_SECRET_ACCESS_KEY };
  return environment.STORAGE_PROVIDER === "minio"
    ? createMinioStorage({ ...common, endpoint: environment.S3_ENDPOINT! })
    : createS3Storage({ ...common, endpoint: environment.S3_ENDPOINT });
}
