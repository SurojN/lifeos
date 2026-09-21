import { z } from "zod";

export const medicalExtractionSchema = z.object({
  recordType: z.enum(["PRESCRIPTION", "LAB_REPORT", "VISIT_NOTE", "DISCHARGE_SUMMARY", "OTHER"]),
  eventDate: z.string().date().nullable(),
  providerName: z.string().trim().max(200).nullable(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(5_000).nullable(),
  medications: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(500).nullable(),
  }).strict()).max(50),
  confidence: z.number().min(0).max(1),
  sourceNotes: z.array(z.string().trim().max(500)).max(20),
}).strict();

export type MedicalExtraction = z.infer<typeof medicalExtractionSchema>;

export interface MedicalExtractionInput {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
}

export interface MedicalExtractionProvider {
  readonly name: string;
  readonly model: string;
  extractMedicalDocument(input: MedicalExtractionInput): Promise<MedicalExtraction>;
}
