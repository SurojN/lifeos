import { requireInternalUser } from "@/lib/auth/adapter";
import { listLifeEventsForUser } from "@/repositories/life-events";
import { Activity } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default async function Page() {
  const user = await requireInternalUser();
  const events = await listLifeEventsForUser(user.id);
  return <div className="grid gap-6"><PageHero eyebrow="LIFE TIMELINE" title="What happened, with evidence" description="Nothing is collected automatically. Each sourced fact shows where it came from." icon={Activity} status={`${events.length} life event${events.length === 1 ? "" : "s"}`} /><section className="timeline-list grid gap-3">{events.length ? events.map((event) => <article key={event.id} className="relative rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-primary">{event.category}</span><span className="rounded-full bg-muted px-2 py-1 text-xs">{event.verificationStatus.replaceAll("_", " ")}</span></div><h2 className="mt-2 font-semibold">{event.title}</h2><p className="mt-1 text-sm text-muted-foreground">{event.occurredAt.toLocaleDateString()}</p>{event.description && <p className="mt-3 text-sm">{event.description}</p>}<p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Source: {event.sourceFileName ?? "User entry"}</p></article>) : <p className="empty-state">Your timeline is empty. Add a plan, memory, goal, or confirmed medical record to begin.</p>}</section></div>;
}
