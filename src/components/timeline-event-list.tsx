"use client";

import { useDeferredValue, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { matchesPersonalSearch } from "@/lib/personal-search";

const categories = ["ALL", "HEALTH", "FINANCE", "TRAVEL", "IDENTITY", "EDUCATION", "CAREER", "FAMILY", "PROPERTY", "GENERAL"] as const;

type TimelineEvent = {
  id: string;
  category: string;
  verificationStatus: string;
  title: string;
  description: string | null;
  occurredAt: string;
  occurredAtLabel: string;
  sourceFileName: string | null;
  sourceDocumentId: string | null;
  sourceAvailable: boolean;
};

export function TimelineEventList({ events }: { events: TimelineEvent[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("ALL");
  const deferredQuery = useDeferredValue(query);
  const matchingEvents = events.filter((event) => (category === "ALL" || event.category === category) && matchesPersonalSearch(deferredQuery, [event.title, event.description, event.category, event.occurredAt, event.occurredAtLabel, event.sourceFileName]));

  if (events.length === 0) return <div className="empty-state"><p className="font-medium text-foreground">Your timeline is ready.</p><p className="mt-1">A confirmed medical record, plan, memory, or goal will appear here with its source.</p></div>;

  return <div className="grid gap-4">
    <section className="rounded-xl border bg-card p-4" aria-label="Search and filter timeline">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div><label className="text-sm font-medium" htmlFor="timeline-search">Search your history</label>
          <div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input id="timeline-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} autoComplete="off" placeholder="Title, date, detail, or source…" className="h-11 w-full rounded-xl border bg-white/70 pl-9 pr-10 text-sm"/>{query && <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Clear timeline search"><X className="size-4"/></button>}</div>
        </div>
        <label className="text-sm font-medium" htmlFor="timeline-category">Category
          <select id="timeline-category" value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])} className="mt-1 h-11 w-full rounded-xl border bg-white/70 px-3 text-sm">{categories.map((value) => <option key={value} value={value}>{value === "ALL" ? "All categories" : value.charAt(0) + value.slice(1).toLocaleLowerCase()}</option>)}</select>
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Filters stay in this page and are not added to the URL.</p>
      {(deferredQuery.trim() || category !== "ALL") && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"><span>{matchingEvents.length} of {events.length} event{events.length === 1 ? "" : "s"}</span><button type="button" onClick={() => { setQuery(""); setCategory("ALL"); }} className="font-semibold text-primary hover:underline">Clear filters</button></div>}
    </section>

    <section className="timeline-list grid gap-3" aria-live="polite">
      {matchingEvents.length > 0 ? matchingEvents.map((event) => <article key={event.id} className="relative rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-primary">{event.category}</span><Badge>{event.verificationStatus.replaceAll("_", " ").toLocaleLowerCase()}</Badge></div>
        <h2 className="mt-2 font-semibold">{event.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{event.occurredAtLabel}</p>
        {event.description && <p className="mt-3 text-sm leading-6">{event.description}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span>Source: {event.sourceFileName ?? "User entry"}</span>
          {event.sourceDocumentId && event.sourceAvailable ? <a href={`/api/documents/${event.sourceDocumentId}/download`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><Download className="size-3.5"/>Download original</a> : event.sourceFileName ? <span>Original source was deleted</span> : null}
        </div>
      </article>) : <div className="empty-state"><p className="font-medium text-foreground">No events match these filters.</p><p className="mt-1">Try fewer words or choose all categories.</p></div>}
    </section>
  </div>;
}
