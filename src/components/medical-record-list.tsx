"use client";

import { useDeferredValue, useState } from "react";
import { Search, X } from "lucide-react";
import { MedicalRecordCard, type MedicalRecordCardData } from "@/components/medical-record-card";
import { matchesPersonalSearch } from "@/lib/personal-search";

export function MedicalRecordList({ records }: { records: MedicalRecordCardData[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matchingRecords = records.filter((record) => matchesPersonalSearch(deferredQuery, [
    record.title,
    record.summary,
    record.providerName,
    record.recordType,
    record.eventDate,
    record.eventDateLabel,
    record.sourceDocument.originalFileName,
    ...record.medications.flatMap((medication) => [medication.name, medication.instructions]),
  ]));

  if (records.length === 0) return <div className="empty-state"><p className="font-medium text-foreground">No confirmed records yet.</p><p className="mt-1">Upload one source and review it to build a trustworthy history.</p></div>;

  return <div className="grid gap-4">
    <div className="grid gap-2">
      <label htmlFor="medical-search" className="text-sm font-medium">Search confirmed health history</label>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
        <input id="medical-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} autoComplete="off" placeholder="Search dates, providers, medicines…" className="h-11 w-full rounded-xl border bg-white/70 pl-9 pr-10 text-sm"/>
        {query && <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Clear medical history search"><X className="size-4"/></button>}
      </div>
      <p className="text-xs text-muted-foreground">Search stays in this page and is not added to the URL.</p>
    </div>
    {deferredQuery.trim() && <p className="rounded-xl bg-muted/55 px-4 py-3 text-sm">{matchingRecords.length} result{matchingRecords.length === 1 ? "" : "s"} for “{deferredQuery.trim()}”</p>}
    {matchingRecords.length > 0 ? matchingRecords.map((record) => <MedicalRecordCard key={record.id} record={record}/>) : <div className="empty-state"><p className="font-medium text-foreground">No records match this search.</p><p className="mt-1">Try a title, date, provider, medicine, record type, or source filename.</p></div>}
  </div>;
}
