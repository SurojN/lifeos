import "server-only";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  STORAGE_PROVIDER: z.enum(["minio", "s3"]),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  AWS_KMS_KEY_ID: z.string().optional(),
  APPLICATION_ENCRYPTION_KEY: z.string().min(32),
}).superRefine((environment, context) => {
  if (environment.STORAGE_PROVIDER === "minio" && !environment.S3_ENDPOINT) {
    context.addIssue({ code: "custom", path: ["S3_ENDPOINT"], message: "S3_ENDPOINT is required for MinIO." });
  }
  if (environment.STORAGE_PROVIDER === "s3" && !environment.AWS_KMS_KEY_ID) {
    context.addIssue({ code: "custom", path: ["AWS_KMS_KEY_ID"], message: "AWS_KMS_KEY_ID is required for production S3." });
  }
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(source: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}
