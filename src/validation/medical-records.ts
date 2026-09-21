import { z } from "zod";

export const medicalRecordTypes = ["PRESCRIPTION", "LAB_REPORT", "VISIT_NOTE", "DISCHARGE_SUMMARY", "OTHER"] as const;

export const medicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  instructions: z.string().trim().max(500).optional(),
}).strict();

export const medicalRecordStructuredDataSchema = z.object({
  medications: z.array(medicationSchema).max(50).default([]),
}).strict();

export const medicalRecordUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(5_000).nullable().optional(),
  providerName: z.string().trim().max(200).nullable().optional(),
  eventDate: z.date().optional(),
}).strict();

export const medicalRecordConfirmationSchema = z.object({
  sourceDocumentId: z.string().trim().min(1).max(64),
  extractionJobId: z.string().trim().min(1).max(64).optional(),
  recordType: z.enum(medicalRecordTypes),
  eventDate: z.coerce.date().refine((date) => date <= new Date(), "The event date cannot be in the future."),
  providerName: z.string().trim().max(200).optional(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(5_000).optional(),
  medications: z.array(medicationSchema).max(50).default([]),
}).strict();

export const medicalRecordReplacementSchema = medicalRecordConfirmationSchema
  .omit({ sourceDocumentId: true, extractionJobId: true })
  .strict();
