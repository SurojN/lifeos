import { Activity } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { LifeEntryForm } from "@/components/life-entry-form";
import { TimelineEventList } from "@/components/timeline-event-list";
import { requirePageUser } from "@/lib/auth/adapter";
import { listLifeEventsForUser } from "@/repositories/life-events";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";

export default async function Page() {
  const user = await requirePageUser();
  const [events, documents] = await Promise.all([
    listLifeEventsForUser(user.id),
    listSourceDocumentsForUser(user.id),
  ]);
  const sourceDocuments = documents
    .filter((document) => ["QUARANTINED", "AVAILABLE"].includes(document.status))
    .map(({ id, originalFileName }) => ({ id, originalFileName }));

  return <div className="grid gap-6">
    <PageHero eyebrow="LIFE TIMELINE" title="What happened, with evidence" description="Search the facts you saved and return to their original source whenever it is available." icon={Activity} status={`${events.length} life event${events.length === 1 ? "" : "s"}`} />

    <details open={events.length === 0} className="rounded-2xl border bg-white/35 p-2">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Add a life event</summary>
      <div className="grid gap-3 pt-2">
        <p className="px-4 text-sm text-muted-foreground">Record an important moment and optionally link its original paper or document. Only save what you know; this entry will be labeled user entered.</p>
        <LifeEntryForm kind="GENERAL" allowCategorySelection sourceDocuments={sourceDocuments} submitLabel="Save life event"/>
      </div>
    </details>

    <TimelineEventList sourceDocuments={sourceDocuments} events={events.map((event) => {
      const metadata = typeof event.metadata === "object" && event.metadata !== null && !Array.isArray(event.metadata) ? event.metadata : {};
      const userEntered = "origin" in metadata && metadata.origin === "USER_ENTERED";
      const medicalRecord = Boolean(event.medicalRecordId) || "medicalRecordId" in metadata;
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
        canEdit: userEntered && !medicalRecord,
        medicalRecord,
      };
    })}/>
  </div>;
}
