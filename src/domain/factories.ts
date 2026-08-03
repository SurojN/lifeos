import {
  CURRENT_SCHEMA_VERSION,
  LOCAL_OWNER_ID,
  type DocumentCategory,
  type LifeEvent,
  type LifeEventCategory,
  type MedicalReviewInput,
  type StoredSourceDocument,
} from "./models.ts";

export interface NewEventInput {
  title: string;
  category: LifeEventCategory;
  occurredAt: string;
  sourceLabel?: string;
  description?: string;
}

export function createUserEnteredEvent(input: NewEventInput, id: string, createdAt: string): LifeEvent {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    userId: LOCAL_OWNER_ID,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    occurredAt: input.occurredAt,
    createdAt,
    source: { type: "user_entry", label: input.sourceLabel?.trim() || "User entry" },
    verificationStatus: "unverified",
    origin: "user_entered",
    metadata: {},
    tags: [],
    relatedEventIds: [],
  };
}

export function createStoredDocument(
  input: { title: string; category: DocumentCategory; documentDate: string; file: File },
  id: string,
  uploadedAt: string,
): StoredSourceDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    ownerId: LOCAL_OWNER_ID,
    title: input.title.trim(),
    filename: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    category: input.category,
    documentDate: input.documentDate,
    uploadedAt,
    storageReference: `indexeddb:documents/${id}`,
    extractionStatus: "not_started",
    retentionState: "active",
    blob: input.file,
  };
}

export function createConfirmedMedicalEvent(
  input: MedicalReviewInput,
  document: StoredSourceDocument,
  id: string,
  createdAt: string,
): LifeEvent {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    userId: LOCAL_OWNER_ID,
    category: "health",
    title: input.title.trim(),
    description: input.facts.trim(),
    occurredAt: input.occurredAt,
    createdAt,
    source: { type: "source_document", documentId: document.id, label: document.title },
    verificationStatus: "user_confirmed",
    origin: "user_entered",
    metadata: {
      recordType: "medical_document_review",
      ...(input.provider.trim() ? { provider: input.provider.trim() } : {}),
      confirmedFacts: input.facts.trim(),
    },
    tags: ["medical-document"],
    relatedEventIds: [],
  };
}
