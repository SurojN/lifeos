import { z } from "zod";

export const medicalRecordUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(5_000).nullable().optional(),
  providerName: z.string().trim().max(200).nullable().optional(),
  eventDate: z.date().optional(),
}).strict();

export const medicalRecordConfirmationSchema = z.object({
  sourceDocumentId: z.string().trim().min(1).max(64),
  recordType: z.enum(["PRESCRIPTION", "LAB_REPORT", "VISIT_NOTE", "DISCHARGE_SUMMARY", "OTHER"]),
  eventDate: z.coerce.date().max(new Date(), "The event date cannot be in the future."),
  providerName: z.string().trim().max(200).optional(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(5_000).optional(),
  medications: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(500).optional(),
  }).strict()).max(50).default([]),
}).strict();
