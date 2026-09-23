import type { TimelineEventData } from "@/components/timeline-event-card";

type SavedEvent = {
  id: string;
  category: string;
  verificationStatus: string;
  title: string;
  description: string | null;
  occurredAt: Date;
  metadata: unknown;
  medicalRecordId: string | null;
  sourceFileName: string | null;
  sourceDocumentId: string | null;
  sourceAvailable: boolean;
};

export function toTimelineEvent(event: SavedEvent): TimelineEventData {
  const metadata = typeof event.metadata === "object" && event.metadata !== null && !Array.isArray(event.metadata) ? event.metadata : {};
  const userEntered = "origin" in metadata && metadata.origin === "USER_ENTERED";
  const medicalRecord = Boolean(event.medicalRecordId) || "medicalRecordId" in metadata;
  const financeRecord = "financeVersion" in metadata;
  const kind = "kind" in metadata && typeof metadata.kind === "string" ? metadata.kind : null;
  return {
    id: event.id,
    category: event.category,
    verificationStatus: event.verificationStatus,
    title: event.title,
    description: event.description,
    occurredAt: event.occurredAt.toISOString(),
    occurredAtLabel: kind === "APPOINTMENT"
      ? `${event.occurredAt.toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" })} (Nepal time)`
      : event.occurredAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "Asia/Kathmandu" }),
    sourceFileName: event.sourceFileName,
    sourceDocumentId: event.sourceDocumentId,
    sourceAvailable: event.sourceAvailable,
    kind,
    userEntered,
    canEdit: userEntered && !medicalRecord && !financeRecord,
    medicalRecord,
    financeRecord,
  };
}
