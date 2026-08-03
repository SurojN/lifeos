export const CURRENT_SCHEMA_VERSION = 2 as const;
export const LOCAL_OWNER_ID = "local-owner" as const;

export type LifeEventCategory =
  | "health"
  | "finance"
  | "travel"
  | "identity"
  | "education"
  | "career"
  | "family"
  | "property"
  | "general";

export type VerificationStatus = "unverified" | "user_confirmed";
export type InformationOrigin = "user_entered" | "calculated" | "machine_extracted";

export interface EventSource {
  type: "user_entry" | "source_document";
  label: string;
  documentId?: string;
}

export interface LifeEvent {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  id: string;
  userId: string;
  category: LifeEventCategory;
  title: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  source: EventSource;
  verificationStatus: VerificationStatus;
  origin: InformationOrigin;
  confidence?: number;
  metadata: Record<string, unknown>;
  tags: string[];
  relatedEventIds: string[];
}

export type DocumentCategory = "health" | "finance" | "travel" | "identity" | "education" | "general";
export type ExtractionStatus = "not_started" | "draft" | "reviewed";
export type RetentionState = "active" | "deleted";

export interface SourceDocument {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  id: string;
  ownerId: string;
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  documentDate: string;
  uploadedAt: string;
  storageReference: string;
  checksum?: string;
  extractionStatus: ExtractionStatus;
  retentionState: RetentionState;
}

export interface StoredSourceDocument extends SourceDocument {
  blob: Blob;
}

export interface MedicalRecord {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  id: string;
  userId: string;
  sourceDocumentId?: string;
  lifeEventId?: string;
  title: string;
  occurredAt: string;
  facts: Record<string, string>;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface FinancialGoal {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  targetDate?: string;
  currency: "NPR";
  origin: "user_entered";
  createdAt: string;
}

export interface RetirementPlan {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedAnnualReturn: number;
  expectedInflation: number;
  desiredMonthlyExpense: number;
}
