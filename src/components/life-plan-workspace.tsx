import { LifeEntryForm } from "@/components/life-entry-form";
import { TimelineEventList } from "@/components/timeline-event-list";
import { requirePageUser } from "@/lib/auth/adapter";
import { toTimelineEvent } from "@/lib/timeline-event";
import { listLifeEventsForUser } from "@/repositories/life-events";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";

export async function LifePlanWorkspace({ kind, title, dateLabel, descriptionLabel, submitLabel }: {
  kind: "APPOINTMENT" | "TRIP" | "LEARNING_GOAL" | "MEMORY";
  title: string;
  dateLabel?: string;
  descriptionLabel: string;
  submitLabel: string;
}) {
  const user = await requirePageUser();
  const [events, documents] = await Promise.all([listLifeEventsForUser(user.id), listSourceDocumentsForUser(user.id)]);
  const sourceDocuments = documents.filter((document) => ["QUARANTINED", "AVAILABLE"].includes(document.status))
    .map(({ id, originalFileName }) => ({ id, originalFileName }));
  const saved = events.map(toTimelineEvent).filter((event) => event.kind === kind);

  return <section className="grid gap-4" aria-label={title}>
    <LifeEntryForm kind={kind} dateLabel={dateLabel} descriptionLabel={descriptionLabel} submitLabel={submitLabel} sourceDocuments={sourceDocuments}/>
    <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">Your saved entries stay connected to the timeline. Open an original, update a detail, or remove an entry here.</p></div>
    {saved.length ? <TimelineEventList events={saved} sourceDocuments={sourceDocuments}/> : <div className="empty-state">Nothing saved here yet. Start with the form above and optionally link a document from your vault.</div>}
  </section>;
}
