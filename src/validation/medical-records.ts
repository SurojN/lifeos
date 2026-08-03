import { z } from "zod";

export const medicalRecordUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(5_000).nullable().optional(),
  providerName: z.string().trim().max(200).nullable().optional(),
  eventDate: z.date().optional(),
}).strict();
