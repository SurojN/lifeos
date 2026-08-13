"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MedicalReviewForm({ documents }: { documents: { id: string; originalFileName: string }[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    setMessage("Saving confirmed information…");
    const response = await fetch("/api/medical/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      sourceDocumentId: formData.get("sourceDocumentId"), recordType: formData.get("recordType"), eventDate: formData.get("eventDate"), title: formData.get("title"), providerName: formData.get("providerName") || undefined, summary: formData.get("summary") || undefined, medications: [],
    }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Could not save the record.");
    setMessage("Confirmed. The record and sourced timeline event are now saved.");
    router.refresh();
  }
  if (!documents.length) return <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Upload a health document first. Uploaded fields are never accepted without your review.</div>;
  const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
  return <form action={submit} className="grid gap-4 rounded-xl border bg-card p-6">
    <div><h2 className="font-semibold">Review and confirm</h2><p className="mt-1 text-sm text-muted-foreground">Enter only what the source says. LifeOS does not diagnose or fill missing details.</p></div>
    <label className="text-sm">Source document<select name="sourceDocumentId" className={input} required>{documents.map((document) => <option key={document.id} value={document.id}>{document.originalFileName}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Record type<select name="recordType" className={input}><option value="PRESCRIPTION">Prescription</option><option value="LAB_REPORT">Lab report</option><option value="VISIT_NOTE">Visit note</option><option value="DISCHARGE_SUMMARY">Discharge summary</option><option value="OTHER">Other</option></select></label><label className="text-sm">Date<input name="eventDate" type="date" max={new Date().toISOString().slice(0, 10)} className={input} required /></label></div>
    <label className="text-sm">Title<input name="title" maxLength={200} className={input} required placeholder="e.g. Follow-up prescription" /></label>
    <label className="text-sm">Hospital or clinician (optional)<input name="providerName" maxLength={200} className={input} /></label>
    <label className="text-sm">Source summary (optional)<textarea name="summary" maxLength={5000} rows={4} className={input} /></label>
    <Button type="submit">I reviewed this — save as confirmed</Button>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </form>;
}
