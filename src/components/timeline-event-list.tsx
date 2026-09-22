"use client";

import { useDeferredValue, useState } from "react";
import { Search, X } from "lucide-react";
import { LIFE_EVENT_CATEGORIES, type LifeEntrySourceDocument } from "@/components/life-entry-form";
import { TimelineEventCard, type TimelineEventData } from "@/components/timeline-event-card";
import { matchesPersonalSearch } from "@/lib/personal-search";

const categories = ["ALL", ...LIFE_EVENT_CATEGORIES] as const;

export function TimelineEventList({ events, sourceDocuments = [] }: { events: TimelineEventData[]; sourceDocuments?: LifeEntrySourceDocument[] }) {
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
      {matchingEvents.length > 0 ? matchingEvents.map((event) => <TimelineEventCard key={event.id} event={event} sourceDocuments={sourceDocuments}/>) : <div className="empty-state"><p className="font-medium text-foreground">No events match these filters.</p><p className="mt-1">Try fewer words or choose all categories.</p></div>}
    </section>
  </div>;
}
