"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import type { MedicalRecordCardData } from "@/components/medical-record-card";
import { Button } from "@/components/ui/button";
import { buildAppointmentBrief } from "@/lib/appointment-brief";

export function AppointmentPreparation({ records }: { records: MedicalRecordCardData[] }) {
  const [purpose, setPurpose] = useState("");
  const [questions, setQuestions] = useState("");
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const brief = buildAppointmentBrief({ purpose, questions, records, selectedRecordIds });
  const hasContent = Boolean(purpose.trim() || questions.trim() || brief.records.length);
  const inputClassName = "mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm";

  function toggleRecord(recordId: string) {
    setSelectedRecordIds((selected) => selected.includes(recordId)
      ? selected.filter((id) => id !== recordId)
      : [...selected, recordId]);
    setMessage("");
  }

  function downloadBrief() {
    if (!hasContent) return;
    const url = URL.createObjectURL(new Blob([brief.text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifeos-appointment-brief.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Download requested. Your brief includes only the notes and records shown in the preview.");
  }

  return <section aria-labelledby="appointment-preparation-heading" className="grid gap-6 rounded-2xl border bg-card p-5 sm:p-6">
    <div>
      <p className="eyebrow"><FileText className="size-4"/>PREPARE FOR YOUR VISIT</p>
      <h2 id="appointment-preparation-heading" className="mt-2 text-xl font-medium tracking-tight">Bring the right history and your questions</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose the records you want to discuss, then review and download a brief. Your draft stays in this page until you download it; leaving the page clears it.</p>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-2">
      <div className="grid gap-5">
        <label className="text-sm font-medium">What is this visit for?
          <textarea value={purpose} onChange={(event) => { setPurpose(event.target.value); setMessage(""); }} rows={2} maxLength={1000} placeholder="Write the purpose in your own words" className={inputClassName}/>
        </label>
        <label className="text-sm font-medium">Questions to ask
          <textarea value={questions} onChange={(event) => { setQuestions(event.target.value); setMessage(""); }} rows={4} maxLength={5000} placeholder="Write the questions you want to remember" className={inputClassName}/>
        </label>

        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold">Choose confirmed health records</legend>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Nothing is selected automatically. Medicines are copied as historical information from each source.</p>
          {records.length > 0 ? <div className="mt-3 grid max-h-96 gap-2 overflow-y-auto">
            {records.map((record) => <label key={record.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:bg-muted/40">
              <input type="checkbox" checked={selectedRecordIds.includes(record.id)} onChange={() => toggleRecord(record.id)} className="mt-1 size-4 shrink-0 accent-primary"/>
              <span className="min-w-0 text-sm">
                <span className="block break-words font-medium">{record.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{record.eventDateLabel}{record.providerName ? ` · ${record.providerName}` : ""} · User confirmed</span>
                <span className="mt-1 block break-words text-xs text-muted-foreground">Source: {record.sourceDocument.originalFileName}{record.sourceDocument.available ? "" : " · Original unavailable"}</span>
              </span>
            </label>)}
          </div> : <div className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <p>You can prepare your questions now. Add and confirm a medical record to include sourced history.</p>
            <Link href="/medical" className="mt-2 inline-block font-semibold text-primary hover:underline">Add a medical source</Link>
          </div>}
        </fieldset>
      </div>

      <div className="grid min-w-0 gap-4 rounded-xl bg-muted/35 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Review your brief</h3>
          <span className="text-xs text-muted-foreground" aria-live="polite">{brief.records.length} record{brief.records.length === 1 ? "" : "s"} selected</span>
        </div>
        {hasContent ? <pre role="region" aria-label="Appointment brief preview" tabIndex={0} className="max-h-[36rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border bg-card p-4 font-sans text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{brief.text}</pre>
          : <p className="rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">Your preview will appear here when you write a note or choose a record.</p>}
        {brief.records.some((record) => record.sourceDocument.available) && <div>
          <p className="text-xs font-semibold">Check the original evidence</p>
          <ul className="mt-2 grid gap-2 text-xs">{brief.records.filter((record) => record.sourceDocument.available).map((record) => <li key={record.id}>
            <a href={`/api/documents/${record.sourceDocument.id}/download`} className="break-words font-medium text-primary hover:underline">{record.title} — {record.sourceDocument.originalFileName}</a>
          </li>)}</ul>
        </div>}
        <Button type="button" className="justify-self-start" onClick={downloadBrief} disabled={!hasContent}><Download className="mr-2 size-4"/>Download brief (.txt)</Button>
        <p className="text-xs leading-5 text-muted-foreground">The downloaded file contains your selected health information. It includes source references; original files stay in LifeOS. Downloading does not send it to a clinician or an AI service.</p>
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
      </div>
    </div>
  </section>;
}
