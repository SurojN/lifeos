"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Trash2 } from "lucide-react";
import type { LifeEntrySourceDocument } from "@/components/life-entry-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TimelineEventData = {
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
  kind: string | null;
  userEntered: boolean;
  canEdit: boolean;
  medicalRecord: boolean;
  financeRecord?: boolean;
};

const inputClassName = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

function editDateValue(event: TimelineEventData): string {
  if (event.kind !== "APPOINTMENT") return event.occurredAt.slice(0, 10);
  const date = new Date(event.occurredAt);
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

export function TimelineEventCard({ event, sourceDocuments }: { event: TimelineEventData; sourceDocuments: LifeEntrySourceDocument[] }) {
  const router = useRouter();
  const requestPending = useRef(false);
  const [editing, setEditing] = useState(false);
  const [initialDate, setInitialDate] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  function edit() {
    setInitialDate(editDateValue(event));
    setMessage("");
    setHasError(false);
    setEditing(true);
  }

  async function save(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (requestPending.current) return;
    const formData = new FormData(submitEvent.currentTarget);
    requestPending.current = true;
    setBusy("save");
    setMessage("");
    setHasError(false);
    try {
      const enteredDate = String(formData.get("occurredAt") ?? "");
      const sourceDocumentId = String(formData.get("sourceDocumentId") ?? "") || null;
      // Editing another field must not truncate seconds or reinterpret the saved time zone.
      const occurredAt = enteredDate === initialDate ? event.occurredAt
        : event.kind === "APPOINTMENT" ? new Date(enteredDate).toISOString() : enteredDate;
      const response = await fetch(`/api/life-events/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || "",
          occurredAt,
          sourceDocumentId: sourceDocumentId === event.sourceDocumentId ? undefined : sourceDocumentId,
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not save your changes.");
      setEditing(false);
      setMessage("Your event was updated.");
      router.refresh();
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Could not save your changes. Your draft is still here.");
    } finally {
      requestPending.current = false;
      setBusy(null);
    }
  }

  async function remove() {
    if (requestPending.current) return;
    if (!window.confirm(`Delete “${event.title}” from your timeline? Any source document will remain in Documents.`)) return;
    requestPending.current = true;
    setBusy("delete");
    setMessage("");
    setHasError(false);
    try {
      const response = await fetch(`/api/life-events/${event.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not delete this event.");
      setDeleted(true);
      router.refresh();
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Could not delete this event.");
    } finally {
      requestPending.current = false;
      setBusy(null);
    }
  }

  if (deleted) return null;

  const provenance = event.userEntered ? "User entered" : event.verificationStatus.replaceAll("_", " ").toLocaleLowerCase();
  const currentSourceMissing = event.sourceDocumentId && !sourceDocuments.some((document) => document.id === event.sourceDocumentId);

  return <article className="relative rounded-xl border bg-card p-5" aria-busy={busy !== null}>
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-primary">{event.category}</span><Badge>{provenance}</Badge></div>
    <h2 className="mt-2 font-semibold">{event.title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{event.occurredAtLabel}</p>
    {event.kind === "APPOINTMENT" && <p className="mt-1 text-xs text-muted-foreground">User-entered appointment plan. Confirm the booking directly with the provider.</p>}
    {event.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{event.description}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
      <span>Source: {event.sourceFileName ?? "User entry"}</span>
      {event.sourceDocumentId && event.sourceAvailable ? <a href={`/api/documents/${event.sourceDocumentId}/download`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><Download className="size-3.5"/>Download original</a> : event.sourceDocumentId ? <span>Original source unavailable</span> : null}
    </div>

    {event.canEdit && !editing && <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={edit} disabled={busy !== null}><Pencil className="mr-1.5 size-3.5"/>Edit event</Button>
      <Button type="button" variant="outline" onClick={remove} disabled={busy !== null} className="text-red-700"><Trash2 className="mr-1.5 size-3.5"/>{busy === "delete" ? "Deleting…" : "Delete event"}</Button>
    </div>}
    {event.medicalRecord && <p className="mt-4 text-sm"><Link href="/medical" className="font-semibold text-primary hover:underline">Edit or delete the linked medical record</Link><span className="mt-1 block text-xs text-muted-foreground">Changes there keep the medical record and this event together.</span></p>}
    {event.financeRecord && <p className="mt-4 text-sm"><Link href="/finance" className="font-semibold text-primary hover:underline">Manage this entry in Finance</Link><span className="mt-1 block text-xs text-muted-foreground">Update amounts and dates there to keep your totals consistent.</span></p>}

    {editing && <form onSubmit={save} className="mt-5 grid gap-4 border-t pt-5">
      <fieldset disabled={busy !== null} className="grid min-w-0 gap-4">
        <legend className="mb-3 text-sm font-semibold">Edit this event</legend>
        <label className="text-sm">Title<input name="title" defaultValue={event.title} maxLength={200} required className={inputClassName}/></label>
        <label className="text-sm">{event.kind === "APPOINTMENT" ? "Date and time" : "Date"}
          <input name="occurredAt" type={event.kind === "APPOINTMENT" ? "datetime-local" : "date"} defaultValue={initialDate} required className={inputClassName}/>
          {event.kind === "APPOINTMENT" && <span className="mt-1 block text-xs text-muted-foreground">The editable date and time use this device’s local time zone.</span>}
        </label>
        <label className="text-sm">Notes<textarea name="description" defaultValue={event.description ?? ""} rows={4} maxLength={5000} className={inputClassName}/></label>
        <label className="text-sm">Source document <span className="text-muted-foreground">(optional)</span>
          <select name="sourceDocumentId" defaultValue={event.sourceDocumentId ?? ""} className={inputClassName}>
            <option value="">No source document — my own entry</option>
            {currentSourceMissing && <option value={event.sourceDocumentId ?? ""}>Keep existing source: {event.sourceFileName ?? "original unavailable"} (unavailable)</option>}
            {sourceDocuments.map((document) => <option key={document.id} value={document.id}>{document.originalFileName}</option>)}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">Changing this link does not delete or verify the original document.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy !== null}>{busy === "save" ? "Saving changes…" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={() => { setEditing(false); setMessage(""); }} disabled={busy !== null}>Cancel</Button>
        </div>
      </fieldset>
    </form>}
    {message && <p role="status" className={`mt-3 text-sm ${hasError ? "text-red-700" : "text-muted-foreground"}`}>{message}</p>}
  </article>;
}
