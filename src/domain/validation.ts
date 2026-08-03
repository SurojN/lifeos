import type { LifeEvent, RetirementPlan } from "./models.ts";

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function validateLifeEvent(event: LifeEvent): string[] {
  const errors: string[] = [];
  if (!event.id) errors.push("Event id is required.");
  if (!event.title.trim()) errors.push("Event title is required.");
  if (!isIsoDate(event.occurredAt)) errors.push("Event date must be a valid ISO date.");
  if (!event.source.label.trim()) errors.push("Event source label is required.");
  if (event.source.type === "source_document" && !event.source.documentId) errors.push("A document source requires a document id.");
  if (event.confidence !== undefined && (event.confidence < 0 || event.confidence > 1)) errors.push("Confidence must be between 0 and 1.");
  return errors;
}

export function normalizeRetirementPlan(plan: RetirementPlan): RetirementPlan {
  return Object.fromEntries(
    Object.entries(plan).map(([key, value]) => [key, Number.isFinite(value) && value >= 0 ? value : 0]),
  ) as unknown as RetirementPlan;
}

export function validateDocumentFile(file: File): string[] {
  const errors: string[] = [];
  if (!file.size) errors.push("Choose a non-empty document.");
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) errors.push("Document must be 10 MB or smaller.");
  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
    errors.push("Document must be a PDF, JPEG, or PNG file.");
  }
  return errors;
}
