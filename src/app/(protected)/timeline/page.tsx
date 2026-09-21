import { Activity } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { TimelineEventList } from "@/components/timeline-event-list";
import { requireInternalUser } from "@/lib/auth/adapter";
import { listLifeEventsForUser } from "@/repositories/life-events";

export default async function Page() {
  const user = await requireInternalUser();
  const events = await listLifeEventsForUser(user.id);

  return <div className="grid gap-6">
    <PageHero eyebrow="LIFE TIMELINE" title="What happened, with evidence" description="Search the facts you saved and return to their original source whenever it is available." icon={Activity} status={`${events.length} life event${events.length === 1 ? "" : "s"}`} />

    <TimelineEventList events={events.map((event) => ({
      id: event.id,
      category: event.category,
      verificationStatus: event.verificationStatus,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt.toISOString().slice(0, 10),
      occurredAtLabel: event.occurredAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "Asia/Kathmandu" }),
      sourceFileName: event.sourceFileName,
      sourceDocumentId: event.sourceDocumentId,
      sourceAvailable: event.sourceAvailable,
    }))}/>
  </div>;
}
