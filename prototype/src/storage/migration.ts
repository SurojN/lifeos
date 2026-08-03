import {
  CURRENT_SCHEMA_VERSION,
  LOCAL_OWNER_ID,
  type DocumentCategory,
  type LifeEvent,
  type LifeEventCategory,
  type RetirementPlan,
  type StoredSourceDocument,
} from "../domain/models.ts";
import { isIsoDate, normalizeRetirementPlan } from "../domain/validation.ts";

export const LEGACY_EVENT_KEY = "lifeos.events.v1";
export const LEGACY_PLAN_KEY = "lifeos.retirement.v1";
export const MIGRATION_SETTING_KEY = "migration.v1-complete";
export const RETIREMENT_SETTING_KEY = "retirement-plan";

const categories: Record<string, LifeEventCategory> = {
  health: "health", finance: "finance", travel: "travel", identity: "identity",
  learning: "education", education: "education", personal: "general", general: "general",
};

const documentCategories: Record<string, DocumentCategory> = {
  health: "health", finance: "finance", travel: "travel", identity: "identity",
  learning: "education", education: "education", other: "general", general: "general",
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function migrateLegacyEvent(value: unknown): LifeEvent | undefined {
  const old = record(value);
  if (!old) return undefined;
  const id = text(old.id);
  const title = text(old.title);
  const occurredAt = text(old.occurredOn);
  if (!id || !title || !isIsoDate(occurredAt)) return undefined;
  const sourceLabel = text(old.source) || "User entry";
  const createdAt = text(old.createdAt);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    userId: LOCAL_OWNER_ID,
    category: categories[text(old.category)] ?? "general",
    title,
    description: text(old.notes),
    occurredAt,
    createdAt: createdAt && !Number.isNaN(Date.parse(createdAt)) ? createdAt : new Date(`${occurredAt}T00:00:00Z`).toISOString(),
    source: { type: "user_entry", label: sourceLabel },
    verificationStatus: "unverified",
    origin: "user_entered",
    metadata: { migratedFrom: "v0.1" },
    tags: [],
    relatedEventIds: [],
  };
}

export function migrateLegacyEvents(value: unknown): LifeEvent[] {
  return Array.isArray(value) ? value.map(migrateLegacyEvent).filter((item): item is LifeEvent => Boolean(item)) : [];
}

export function migrateLegacyPlan(value: unknown, fallback: RetirementPlan): RetirementPlan {
  const old = record(value);
  if (!old) return fallback;
  const merged = Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => {
    const candidate = old[key];
    return [key, typeof candidate === "number" ? candidate : defaultValue];
  })) as unknown as RetirementPlan;
  return normalizeRetirementPlan(merged);
}

export function migrateStoredDocument(value: unknown): StoredSourceDocument | undefined {
  const old = record(value);
  if (!old || !(old.blob instanceof Blob)) return undefined;
  const id = text(old.id);
  const filename = text(old.filename) || text(old.fileName);
  if (!id || !filename) return undefined;
  const sizeValue = typeof old.size === "number" ? old.size : old.fileSize;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    ownerId: text(old.ownerId) || LOCAL_OWNER_ID,
    title: text(old.title) || filename,
    filename,
    mimeType: text(old.mimeType) || text(old.fileType) || "application/octet-stream",
    size: typeof sizeValue === "number" && sizeValue >= 0 ? sizeValue : old.blob.size,
    category: documentCategories[text(old.category)] ?? "general",
    documentDate: text(old.documentDate) || text(old.occurredOn),
    uploadedAt: text(old.uploadedAt) || text(old.createdAt) || new Date(0).toISOString(),
    storageReference: text(old.storageReference) || `indexeddb:documents/${id}`,
    checksum: text(old.checksum) || undefined,
    extractionStatus: old.extractionStatus === "draft" || old.extractionStatus === "reviewed" ? old.extractionStatus : "not_started",
    retentionState: old.retentionState === "deleted" ? "deleted" : "active",
    blob: old.blob,
  };
}
