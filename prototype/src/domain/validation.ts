import type { LifeEvent, RetirementPlan } from "./models.ts";

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
