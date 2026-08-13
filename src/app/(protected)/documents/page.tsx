import { DocumentUploadForm } from "@/components/document-upload-form";
import { requireInternalUser } from "@/lib/auth/adapter";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";
import { Files } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default async function Page() {
  const user = await requireInternalUser();
  const documents = await listSourceDocumentsForUser(user.id);
  return <div className="grid gap-6"><PageHero eyebrow="DOCUMENTS" title="Your private sources" description="Original files stay separate from confirmed facts so every record remains traceable." icon={Files} tone="blue" status={`${documents.length} document${documents.length === 1 ? "" : "s"} stored`} /><DocumentUploadForm /><section className="grid gap-3"><h2 className="text-lg font-medium tracking-tight">Stored documents</h2>{documents.length ? documents.map((document) => <article key={document.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{document.originalFileName}</span><span className="rounded-full bg-muted px-2 py-1 text-xs">{document.verificationStatus.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-muted-foreground">{document.mimeType} · {(document.sizeBytes / 1024).toFixed(1)} KB · {document.status.toLowerCase()}</p>{["QUARANTINED", "AVAILABLE"].includes(document.status) && <a href={`/api/documents/${document.id}/download`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Download original</a>}</article>) : <p className="empty-state">Your vault is ready. Upload the first source document above.</p>}</section></div>;
}
