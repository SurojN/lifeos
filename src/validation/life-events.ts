import { z } from "zod";

export const userLifeEventSchema = z.object({
  category: z.enum(["HEALTH", "FINANCE", "TRAVEL", "IDENTITY", "EDUCATION", "CAREER", "FAMILY", "PROPERTY", "GENERAL"]),
  kind: z.enum(["APPOINTMENT", "TRIP", "LEARNING_GOAL", "MEMORY", "FINANCIAL_GOAL", "GENERAL"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5_000).optional(),
  occurredAt: z.coerce.date(),
  metadata: z.record(z.string(), z.union([z.string().max(1_000), z.number().finite(), z.boolean(), z.null()])).default({}),
}).strict();
