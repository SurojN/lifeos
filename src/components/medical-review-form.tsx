"use client";

import { useRef, useState, type FormEvent } from "react";
import { Download, Info, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { MedicationFields, type MedicationDraft } from "@/components/medication-fields";
import { Button } from "@/components/ui/button";

type SourceDocument = {
  id: string;
  originalFileName: string;
  mimeType: string;
};

type Suggestion = {
  jobId: string;
  recordType: string;
  eventDate: string | null;
  providerName: string | null;
  title: string;
  summary: string | null;
  medications: Array<{ name: string; instructions: string | null }>;
  confidence: number;
  sourceNotes: string[];
};

type StatusMessage = { tone: "error" | "success" | "neutral"; text: string } | null;

const inputClassName = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

export function MedicalReviewForm({ documents }: { documents: SourceDocument[] }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState(documents[0]?.id ?? "");
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? documents[0];

  if (selectedDocument && selectedDocument.id !== selectedDocumentId) {
    setSelectedDocumentId(selectedDocument.id);
  }

  if (!selectedDocument) return <section className="rounded-xl border border-dashed bg-white/35 p-6">
    <p className="font-medium">Step 2 — Review the document</p>
    <p className="mt-2 text-sm text-muted-foreground">Upload a health document above first. LifeOS will never add its contents to your history without your confirmation.</p>
  </section>;

  return <MedicalReviewDraft key={selectedDocument.id} documents={documents} selectedDocument={selectedDocument} onSelectDocument={setSelectedDocumentId}/>;
}

function MedicalReviewDraft({ documents, selectedDocument, onSelectDocument }: {
  documents: SourceDocument[];
  selectedDocument: SourceDocument;
  onSelectDocument: (documentId: string) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const requestPending = useRef(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [medications, setMedications] = useState<MedicationDraft[]>([]);
  const [aiConsent, setAiConsent] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const supportsAiExtraction = ["image/jpeg", "image/png"].includes(selectedDocument.mimeType);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    const formData = new FormData(event.currentTarget);
    requestPending.current = true;
    setSaving(true);
    setMessage({ tone: "neutral", text: "Saving your reviewed information…" });
    try {
      const response = await fetch("/api/medical/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceDocumentId: selectedDocument.id,
          extractionJobId: suggestion?.jobId,
          recordType: formData.get("recordType"),
          eventDate: formData.get("eventDate"),
          title: formData.get("title"),
          providerName: formData.get("providerName") || undefined,
          summary: formData.get("summary") || undefined,
          medications: medications.map(({ name, instructions }) => ({
            name: name.trim(),
            instructions: instructions.trim() || undefined,
          })),
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not save the record.");

      setSuggestion(null);
      setMedications([]);
      setAiConsent(false);
      formRef.current?.reset();
      setMessage({ tone: "success", text: "Confirmed. The record and its source-linked timeline event are saved." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not save the record." });
    } finally {
      requestPending.current = false;
      setSaving(false);
    }
  }

  async function extract() {
    if (requestPending.current || !supportsAiExtraction || !aiConsent) return;
    requestPending.current = true;
    setExtracting(true);
    setMessage({ tone: "neutral", text: "Sending only this image for one-time extraction…" });
    try {
      const response = await fetch("/api/medical/extractions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceDocumentId: selectedDocument.id, consent: true }),
      });
      const result = await response.json().catch(() => null) as ({ jobId: string; extraction: Omit<Suggestion, "jobId"> } & { error?: never }) | { error?: string } | null;
      if (!response.ok || !result || !("extraction" in result)) throw new Error(result?.error ?? "AI extraction failed.");

      const nextSuggestion = { jobId: result.jobId, ...result.extraction };
      setSuggestion(nextSuggestion);
      setMedications(nextSuggestion.medications.map((medication) => ({ name: medication.name, instructions: medication.instructions ?? "" })));
      setMessage({ tone: "success", text: "Suggestions loaded. Compare every field with the original before saving." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "AI extraction failed." });
    } finally {
      requestPending.current = false;
      setExtracting(false);
    }
  }

  return <form ref={formRef} key={suggestion?.jobId ?? "manual"} onSubmit={submit} aria-busy={saving || extracting} className="grid gap-5 rounded-xl border bg-card p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="eyebrow">STEP 2 OF 3</p>
        <h2 className="mt-2 font-semibold">Review and confirm</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter only what the source says. LifeOS does not diagnose or fill missing details.</p>
      </div>
      <a href={`/api/documents/${selectedDocument.id}/download`} className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white/70 px-3 text-sm font-medium hover:bg-white">
        <Download className="size-4"/>Original source
      </a>
    </div>

    <fieldset disabled={saving || extracting} className="grid min-w-0 gap-5">
    <label className="text-sm font-medium">Source document
      <select name="sourceDocumentId" value={selectedDocument.id} onChange={(event) => { if (!requestPending.current) onSelectDocument(event.target.value); }} className={inputClassName} required>
        {documents.map((document) => <option key={document.id} value={document.id}>{document.originalFileName}</option>)}
      </select>
    </label>

    <section className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4" aria-label="Optional AI assistance">
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-700"/>
        <div>
          <h3 className="text-sm font-semibold text-amber-950">Optional AI suggestions</h3>
          <p className="mt-1 text-xs leading-5 text-amber-900">AI is not required. If enabled, only the selected image is sent once to the configured provider. Suggestions stay unverified until you review and save them.</p>
        </div>
      </div>
      {supportsAiExtraction ? <>
        <label className="flex items-start gap-2 text-xs text-amber-950">
          <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} className="mt-0.5 size-4"/>
          I consent to sending this selected image for one-time field extraction.
        </label>
        <Button type="button" variant="outline" className="justify-self-start" onClick={extract} disabled={extracting || !aiConsent || saving}>
          {extracting ? "Extracting suggestions…" : "Suggest fields with AI"}
        </Button>
      </> : <p className="flex items-start gap-2 text-xs text-amber-900"><Info className="mt-0.5 size-4 shrink-0"/>AI suggestions currently support JPEG and PNG only. You can review this PDF manually below.</p>}
      {suggestion && <div className="rounded-lg bg-white/70 p-3 text-xs text-amber-950">
        <p><strong>AI-inferred · {Math.round(suggestion.confidence * 100)}% confidence.</strong> Confidence is not verification.</p>
        {suggestion.sourceNotes.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4">{suggestion.sourceNotes.map((note) => <li key={note}>{note}</li>)}</ul>}
      </div>}
    </section>

    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Record type
        <select name="recordType" defaultValue={suggestion?.recordType ?? "PRESCRIPTION"} className={inputClassName}>
          <option value="PRESCRIPTION">Prescription</option><option value="LAB_REPORT">Lab report</option><option value="VISIT_NOTE">Visit note</option><option value="DISCHARGE_SUMMARY">Discharge summary</option><option value="OTHER">Other</option>
        </select>
      </label>
      <label className="text-sm font-medium">Date shown in the source
        <input name="eventDate" type="date" defaultValue={suggestion?.eventDate ?? ""} className={inputClassName} required />
      </label>
    </div>
    <label className="text-sm font-medium">Title
      <input name="title" defaultValue={suggestion?.title ?? ""} maxLength={200} className={inputClassName} required placeholder="e.g. Follow-up prescription" />
    </label>
    <label className="text-sm font-medium">Hospital or clinician <span className="font-normal text-muted-foreground">(optional)</span>
      <input name="providerName" defaultValue={suggestion?.providerName ?? ""} maxLength={200} className={inputClassName} />
    </label>
    <label className="text-sm font-medium">Source summary <span className="font-normal text-muted-foreground">(optional)</span>
      <textarea name="summary" defaultValue={suggestion?.summary ?? ""} maxLength={5000} rows={4} className={inputClassName} />
    </label>

    <MedicationFields idPrefix="new-record" medications={medications} onChange={setMedications}/>

    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={saving || extracting}>{saving ? "Saving confirmed record…" : "I checked the source — save as confirmed"}</Button>
      <p className="text-xs text-muted-foreground">You can correct or delete this record later.</p>
    </div>
    </fieldset>
    {message && <p role="status" aria-live="polite" className={message.tone === "error" ? "text-sm text-red-700" : message.tone === "success" ? "text-sm text-emerald-800" : "text-sm text-muted-foreground"}>{message.text}</p>}
  </form>;
}
