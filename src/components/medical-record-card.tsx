"use client";

import { useState } from "react";
import { Download, FileCheck2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MedicationFields, type MedicationDraft } from "@/components/medication-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type MedicalRecordCardData = {
  id: string;
  recordType: string;
  eventDate: string;
  eventDateLabel: string;
  title: string;
  summary: string | null;
  providerName: string | null;
  medications: MedicationDraft[];
  sourceDocument: {
    id: string;
    originalFileName: string;
    available: boolean;
  };
};

type StatusMessage = { tone: "error" | "success" | "neutral"; text: string } | null;

const inputClassName = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

export function MedicalRecordCard({ record }: { record: MedicalRecordCardData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [medications, setMedications] = useState<MedicationDraft[]>(record.medications);

  function cancelEditing() {
    setEditing(false);
    setMedications(record.medications);
    setMessage(null);
  }

  async function save(formData: FormData) {
    setBusy(true);
    setMessage({ tone: "neutral", text: "Saving corrections…" });
    try {
      const response = await fetch(`/api/medical/records/${record.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recordType: formData.get("recordType"),
          eventDate: formData.get("eventDate"),
          title: formData.get("title"),
          providerName: formData.get("providerName") || undefined,
          summary: formData.get("summary") || undefined,
          medications: medications.map(({ name, instructions }) => ({ name: name.trim(), instructions: instructions.trim() || undefined })),
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "The record could not be updated.");
      setEditing(false);
      setMessage({ tone: "success", text: "Corrections saved to the record and timeline." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The record could not be updated." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this confirmed medical record? Its linked timeline event will also be removed. The original source document will stay in your private vault.")) return;
    setBusy(true);
    setMessage({ tone: "neutral", text: "Deleting record…" });
    try {
      const response = await fetch(`/api/medical/records/${record.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "The record could not be deleted.");
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The record could not be deleted." });
    } finally {
      setBusy(false);
    }
  }

  if (editing) return <form action={save} aria-busy={busy} className="grid gap-4 rounded-xl border bg-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="eyebrow">CORRECT RECORD</p><h3 className="mt-2 font-semibold">Review every change against the source</h3></div>
      <Button type="button" variant="ghost" className="h-9 px-3" onClick={cancelEditing} disabled={busy}>Cancel</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Record type
        <select name="recordType" defaultValue={record.recordType} className={inputClassName}><option value="PRESCRIPTION">Prescription</option><option value="LAB_REPORT">Lab report</option><option value="VISIT_NOTE">Visit note</option><option value="DISCHARGE_SUMMARY">Discharge summary</option><option value="OTHER">Other</option></select>
      </label>
      <label className="text-sm font-medium">Date shown in the source<input name="eventDate" type="date" defaultValue={record.eventDate} className={inputClassName} required /></label>
    </div>
    <label className="text-sm font-medium">Title<input name="title" defaultValue={record.title} maxLength={200} className={inputClassName} required /></label>
    <label className="text-sm font-medium">Hospital or clinician <span className="font-normal text-muted-foreground">(optional)</span><input name="providerName" defaultValue={record.providerName ?? ""} maxLength={200} className={inputClassName} /></label>
    <label className="text-sm font-medium">Source summary <span className="font-normal text-muted-foreground">(optional)</span><textarea name="summary" defaultValue={record.summary ?? ""} maxLength={5000} rows={4} className={inputClassName} /></label>
    <MedicationFields idPrefix={`edit-${record.id}`} medications={medications} onChange={setMedications}/>
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save corrections"}</Button><Button type="button" variant="outline" onClick={cancelEditing} disabled={busy}>Cancel</Button></div>
    {message && <p role="status" aria-live="polite" className={message.tone === "error" ? "text-sm text-red-700" : "text-sm text-muted-foreground"}>{message.text}</p>}
  </form>;

  return <article className="rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2"><Badge className="border-emerald-200 bg-emerald-50 text-emerald-800"><FileCheck2 className="mr-1 size-3.5"/>User confirmed</Badge><span className="text-xs font-medium text-muted-foreground">{record.recordType.replaceAll("_", " ").toLocaleLowerCase()}</span></div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">{record.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{record.eventDateLabel}{record.providerName ? ` · ${record.providerName}` : ""}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-9 px-3" onClick={() => { setEditing(true); setMessage(null); }} disabled={busy}><Pencil className="mr-1.5 size-4"/>Correct</Button>
        <Button type="button" variant="ghost" className="h-9 px-3 text-red-700 hover:bg-red-50" onClick={remove} disabled={busy}><Trash2 className="mr-1.5 size-4"/>Delete</Button>
      </div>
    </div>
    {record.summary && <p className="mt-4 text-sm leading-6">{record.summary}</p>}
    {record.medications.length > 0 && <div className="mt-4 rounded-lg bg-muted/45 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medicines copied from source</p><ul className="mt-2 grid gap-2 text-sm">{record.medications.map((medication, index) => <li key={`${medication.name}-${index}`}><span className="font-medium">{medication.name}</span>{medication.instructions ? <span className="text-muted-foreground"> — {medication.instructions}</span> : null}</li>)}</ul></div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
      <span>Source: {record.sourceDocument.originalFileName}</span>
      {record.sourceDocument.available ? <a href={`/api/documents/${record.sourceDocument.id}/download`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"><Download className="size-3.5"/>Download original</a> : <span>Original source was deleted</span>}
    </div>
    {message && <p role="status" aria-live="polite" className={message.tone === "error" ? "mt-3 text-sm text-red-700" : message.tone === "success" ? "mt-3 text-sm text-emerald-800" : "mt-3 text-sm text-muted-foreground"}>{message.text}</p>}
  </article>;
}
