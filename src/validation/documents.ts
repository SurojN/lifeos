import { z } from "zod";
import { sha256Schema } from "./common";

export const ALLOWED_MEDICAL_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const documentUploadSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MEDICAL_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  checksum: sha256Schema,
  category: z.enum(["HEALTH", "FINANCE", "TRAVEL", "IDENTITY", "EDUCATION", "GENERAL"]),
}).strict();
