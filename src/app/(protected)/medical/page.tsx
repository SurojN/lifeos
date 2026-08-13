import { MedicalReviewForm } from "@/components/medical-review-form";
import { requireInternalUser } from "@/lib/auth/adapter";
import { listMedicalRecordsForUser } from "@/repositories/medical-records";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";
import { HeartPulse } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default async function Page() {
  const user = await requireInternalUser();
  const [records, allDocuments] = await Promise.all([listMedicalRecordsForUser(user.id), listSourceDocumentsForUser(user.id)]);
  const documents = allDocuments.filter((document) => document.category === "HEALTH" && ["QUARANTINED", "AVAILABLE"].includes(document.status)).map(({ id, originalFileName }) => ({ id, originalFileName }));
  return <div className="grid gap-6"><PageHero eyebrow="MEDICAL" title="Reviewed health history" description="Facts become part of your timeline only after you confirm them." icon={HeartPulse} tone="rose" status={`${records.length} confirmed record${records.length === 1 ? "" : "s"}`} /><MedicalReviewForm documents={documents} /><section className="grid gap-3"><h2 className="text-lg font-medium tracking-tight">Confirmed records</h2>{records.length ? records.map((record) => <article key={record.id} className="rounded-xl border bg-card p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{record.title}</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">User confirmed</span></div><p className="mt-1 text-sm text-muted-foreground">{record.eventDate.toLocaleDateString()} {record.providerName ? `· ${record.providerName}` : ""}</p>{record.summary && <p className="mt-3 text-sm">{record.summary}</p>}<p className="mt-3 text-xs text-muted-foreground">Type: {record.recordType.replaceAll("_", " ").toLowerCase()}</p></article>) : <p className="empty-state">No confirmed medical records yet. Upload and review a source to begin.</p>}</section></div>;
}
