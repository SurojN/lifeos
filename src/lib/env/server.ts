import "server-only";
import { z } from "zod";

const databaseEnvironmentSchema = z.object({ DATABASE_URL: z.url().startsWith("postgresql://") });
const clerkEnvironmentSchema = z.object({ CLERK_SECRET_KEY: z.string().min(1) });
const webhookEnvironmentSchema = z.object({ CLERK_WEBHOOK_SECRET: z.string().min(1) });
const encryptionEnvironmentSchema = z.object({
  APPLICATION_ENCRYPTION_KEY: z.string().regex(/^v[1-9]\d*:[A-Za-z0-9+/]{43}=$/, "Use version:base64 for exactly 32 random bytes."),
  APPLICATION_ENCRYPTION_PREVIOUS_KEYS: z.string().optional(),
});
const storageEnvironmentSchema = z.object({
  STORAGE_PROVIDER: z.enum(["minio", "s3"]),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  AWS_KMS_KEY_ID: z.string().optional(),
}).superRefine((environment, context) => {
  if (environment.STORAGE_PROVIDER === "minio" && !environment.S3_ENDPOINT) {
    context.addIssue({ code: "custom", path: ["S3_ENDPOINT"], message: "S3_ENDPOINT is required for MinIO." });
  }
  if (environment.STORAGE_PROVIDER === "s3" && !environment.AWS_KMS_KEY_ID) {
    context.addIssue({ code: "custom", path: ["AWS_KMS_KEY_ID"], message: "AWS_KMS_KEY_ID is required for production S3." });
  }
});

const aiEnvironmentSchema = z.object({
  AI_PROVIDER: z.enum(["openai-compatible"]).optional(),
  AI_API_URL: z.url().optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
}).superRefine((environment, context) => {
  const configured = Boolean(environment.AI_PROVIDER || environment.AI_API_URL || environment.AI_API_KEY || environment.AI_MODEL);
  if (configured && (!environment.AI_PROVIDER || !environment.AI_API_URL || !environment.AI_API_KEY || !environment.AI_MODEL)) {
    context.addIssue({ code: "custom", path: ["AI_PROVIDER"], message: "AI_PROVIDER, AI_API_URL, AI_API_KEY, and AI_MODEL must be configured together." });
  }
});

const serverEnvironmentSchema = databaseEnvironmentSchema.and(clerkEnvironmentSchema).and(webhookEnvironmentSchema).and(encryptionEnvironmentSchema).and(storageEnvironmentSchema).and(aiEnvironmentSchema);
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(source: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}

export const getDatabaseEnvironment = (source: NodeJS.ProcessEnv = process.env) => databaseEnvironmentSchema.parse(source);
export const getWebhookEnvironment = (source: NodeJS.ProcessEnv = process.env) => webhookEnvironmentSchema.parse(source);
export const getEncryptionEnvironment = (source: NodeJS.ProcessEnv = process.env) => encryptionEnvironmentSchema.parse(source);
export const getStorageEnvironment = (source: NodeJS.ProcessEnv = process.env) => storageEnvironmentSchema.parse(source);
