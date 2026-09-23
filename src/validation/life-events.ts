import { z } from "zod";
import { resourceIdSchema } from "./common";

const eventFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5_000).optional(),
  occurredAt: z.union([z.string().trim().min(1), z.date()]).pipe(z.coerce.date()),
};

export const userLifeEventSchema = z.object({
  category: z.enum(["HEALTH", "FINANCE", "TRAVEL", "IDENTITY", "EDUCATION", "CAREER", "FAMILY", "PROPERTY", "GENERAL"]),
  kind: z.enum(["APPOINTMENT", "TRIP", "LEARNING_GOAL", "MEMORY", "FINANCIAL_GOAL", "GENERAL"]),
  ...eventFields,
  sourceDocumentId: resourceIdSchema.optional(),
  metadata: z.record(z.string(), z.union([z.string().max(1_000), z.number().finite(), z.boolean(), z.null()]))
    .refine((metadata) => !("medicalRecordId" in metadata), "Medical records must use the medical review workflow.")
    .refine((metadata) => !("financeVersion" in metadata), "Structured finance records must use the finance workflow.")
    .default({}),
}).strict();

export const userLifeEventReplacementSchema = z.object({
  ...eventFields,
  sourceDocumentId: resourceIdSchema.nullable().optional(),
}).strict();
