"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type EntryKind = "APPOINTMENT" | "TRIP" | "LEARNING_GOAL" | "MEMORY" | "FINANCIAL_GOAL" | "GENERAL";

export const LIFE_EVENT_CATEGORIES = ["HEALTH", "FINANCE", "TRAVEL", "IDENTITY", "EDUCATION", "CAREER", "FAMILY", "PROPERTY", "GENERAL"] as const;

export type LifeEntrySourceDocument = { id: string; originalFileName: string };

const categoryByKind: Record<EntryKind, string> = { APPOINTMENT: "HEALTH", TRIP: "TRAVEL", LEARNING_GOAL: "EDUCATION", MEMORY: "GENERAL", FINANCIAL_GOAL: "FINANCE", GENERAL: "GENERAL" };

export function LifeEntryForm({ kind, dateLabel = "Date", descriptionLabel = "Notes", submitLabel = "Save", allowCategorySelection = false, sourceDocuments }: {
  kind: EntryKind;
  dateLabel?: string;
  descriptionLabel?: string;
  submitLabel?: string;
  allowCategorySelection?: boolean;
  sourceDocuments?: LifeEntrySourceDocument[];
}) {
  const router = useRouter();
  const requestPending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    requestPending.current = true;
    setBusy(true);
    setHasError(false);
    setMessage("Saving…");
    try {
      const enteredDate = String(formData.get("occurredAt") ?? "");
      const occurredAt = kind === "APPOINTMENT" ? new Date(enteredDate).toISOString() : enteredDate;
      const response = await fetch("/api/life-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: allowCategorySelection ? formData.get("category") : categoryByKind[kind],
          kind,
          title: formData.get("title"),
          description: formData.get("description") || undefined,
          occurredAt,
          sourceDocumentId: formData.get("sourceDocumentId") || undefined,
          metadata: {},
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not save this entry.");
      form.reset();
      setMessage("Saved to your private timeline as a user-entered event.");
      router.refresh();
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Could not save this entry. Your draft is still here.");
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  return <form onSubmit={submit} aria-busy={busy} className="grid gap-4 rounded-xl border bg-card p-6">
    <fieldset disabled={busy} className="grid min-w-0 gap-4">
      <label className="text-sm">Title<input name="title" maxLength={200} required className={input} /></label>
      {allowCategorySelection && <label className="text-sm">Category
        <select name="category" defaultValue={categoryByKind[kind]} className={input}>{LIFE_EVENT_CATEGORIES.map((category) => <option key={category} value={category}>{category.charAt(0) + category.slice(1).toLocaleLowerCase()}</option>)}</select>
      </label>}
      <label className="text-sm">{dateLabel}<input name="occurredAt" type={kind === "APPOINTMENT" ? "datetime-local" : "date"} required className={input} />
        {kind === "APPOINTMENT" && <span className="mt-1 block text-xs text-muted-foreground">Enter the appointment in this device’s local time zone. Saving a date does not book it with a provider.</span>}
      </label>
      <label className="text-sm">{descriptionLabel}<textarea name="description" rows={4} maxLength={5000} className={input} /></label>
      {sourceDocuments && <label className="text-sm">Source document <span className="text-muted-foreground">(optional)</span>
        <select name="sourceDocumentId" defaultValue="" className={input}>
          <option value="">No source document — my own entry</option>
          {sourceDocuments.map((document) => <option key={document.id} value={document.id}>{document.originalFileName}</option>)}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">Link an original from Documents. Your entry stays labeled user entered; linking a file does not verify its contents.</span>
      </label>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    </fieldset>
    {message && <p role="status" className={hasError ? "text-sm text-red-700" : "text-sm text-muted-foreground"}>{message}</p>}
  </form>;
}
