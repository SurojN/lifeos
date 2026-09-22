import { Check, FileSearch, HeartPulse, ShieldCheck, Upload } from "lucide-react";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { MedicalRecordList } from "@/components/medical-record-list";
import { MedicalReviewForm } from "@/components/medical-review-form";
import { PageHero } from "@/components/page-hero";
import { requirePageUser } from "@/lib/auth/adapter";
import { listMedicalRecordsForUser } from "@/repositories/medical-records";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";

export default async function Page() {
  const user = await requirePageUser();
  const [records, allDocuments] = await Promise.all([
    listMedicalRecordsForUser(user.id),
    listSourceDocumentsForUser(user.id),
  ]);
  const documents = allDocuments
    .filter((document) => document.category === "HEALTH" && ["QUARANTINED", "AVAILABLE"].includes(document.status))
    .map(({ id, originalFileName, mimeType }) => ({ id, originalFileName, mimeType }));

  return <div className="grid gap-6">
    <PageHero eyebrow="MEDICAL" title="A health history you can verify" description="Keep the original evidence, review every fact, and correct your history whenever needed." icon={HeartPulse} tone="rose" status={`${records.length} confirmed record${records.length === 1 ? "" : "s"}`} />

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Medical record workflow">
      <WorkflowStep icon={Upload} step="1" title="Store the source" detail={documents.length > 0 ? `${documents.length} health source${documents.length === 1 ? "" : "s"} ready` : "Upload a prescription or report"} complete={documents.length > 0}/>
      <WorkflowStep icon={FileSearch} step="2" title="Review the facts" detail="Manual review always works; AI is optional" complete={records.length > 0}/>
      <WorkflowStep icon={ShieldCheck} step="3" title="Use your history" detail={records.length > 0 ? "Searchable and source-linked" : "Save only what you confirm"} complete={records.length > 0}/>
    </section>

    <details open={documents.length === 0} className="group rounded-2xl border bg-white/35 p-2">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>{documents.length === 0 ? "Start here — add a prescription or report" : "Add another health document"}</span><span className="text-xs font-medium text-muted-foreground group-open:hidden">Open</span>
      </summary>
      <div className="pt-2"><DocumentUploadForm category="HEALTH" title="Step 1 — Add a prescription or report" description="PDF, JPEG, or PNG up to 10 MB. The original stays private until you choose to use it." /></div>
    </details>

    <details open={documents.length > 0 && records.length === 0} className="group rounded-2xl border bg-white/35 p-2">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>{records.length === 0 ? "Next — review a source and confirm its facts" : "Create another record from a source"}</span><span className="text-xs font-medium text-muted-foreground group-open:hidden">Open</span>
      </summary>
      <div className="pt-2"><MedicalReviewForm documents={documents}/></div>
    </details>

    <section className="grid gap-4" aria-labelledby="confirmed-records-heading">
      <div><p className="eyebrow">STEP 3 OF 3</p><h2 id="confirmed-records-heading" className="mt-2 text-xl font-medium tracking-tight">Confirmed health history</h2></div>
      <MedicalRecordList records={records.map((record) => ({
        id: record.id,
        recordType: record.recordType,
        eventDate: record.eventDate.toISOString().slice(0, 10),
        eventDateLabel: record.eventDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "Asia/Kathmandu" }),
        title: record.title,
        summary: record.summary,
        providerName: record.providerName,
        medications: record.structuredData.medications.map((medication) => ({ name: medication.name, instructions: medication.instructions ?? "" })),
        sourceDocument: record.sourceDocument,
      }))}/>
    </section>
  </div>;
}

function WorkflowStep({ icon: Icon, step, title, detail, complete }: { icon: typeof Upload; step: string; title: string; detail: string; complete: boolean }) {
  return <article className="rounded-xl border bg-card p-4">
    <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-lg bg-muted text-primary"><Icon className="size-4"/></span>{complete ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="size-3.5"/>Ready</span> : <span className="text-xs font-semibold text-muted-foreground">Step {step}</span>}</div>
    <h2 className="mt-3 text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
  </article>;
}
