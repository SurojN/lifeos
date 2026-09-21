import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, CalendarPlus, FileCheck2, HeartPulse, Landmark, ShieldCheck } from "lucide-react";
import { LifeGuide } from "@/components/life-guide";
import { requireInternalUser } from "@/lib/auth/adapter";
import type { GuideFact } from "@/lib/life-guide";
import { listLifeEventsForUser } from "@/repositories/life-events";
import { listMedicalRecordsForUser } from "@/repositories/medical-records";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";

const actions = [
  { href: "/medical", icon: HeartPulse, title: "Build health history", text: "Keep facts connected to original records", tone: "rose" },
  { href: "/finance", icon: Landmark, title: "Explore a money goal", text: "Compare projections with visible assumptions", tone: "sand" },
  { href: "/appointments", icon: CalendarPlus, title: "Prepare for an appointment", text: "Keep the time, place, and notes together", tone: "blue" },
  { href: "/timeline", icon: Activity, title: "Review your timeline", text: "Find confirmed and user-entered history", tone: "mint" },
] as const;

export default async function Page() {
  const user = await requireInternalUser();
  const [documents, medicalRecords, lifeEvents] = await Promise.all([
    listSourceDocumentsForUser(user.id),
    listMedicalRecordsForUser(user.id),
    listLifeEventsForUser(user.id),
  ]);
  const healthDocuments = documents.filter((document) => document.category === "HEALTH" && ["QUARANTINED", "AVAILABLE"].includes(document.status));
  const nextAction = healthDocuments.length === 0
    ? { href: "/medical", label: "Add your first health source", detail: "Start with one prescription or report" }
    : medicalRecords.length === 0
      ? { href: "/medical", label: "Review your uploaded source", detail: "Confirm only the facts you can see" }
      : lifeEvents.length < 2
        ? { href: "/appointments", label: "Add your next important date", detail: "Turn stored history into practical preparation" }
        : { href: "/timeline", label: "Review your recent history", detail: "Check what is saved and what needs attention" };
  const guideFacts: GuideFact[] = [
    ...medicalRecords.map((record) => ({
      id: record.id,
      category: "HEALTH",
      title: record.title,
      description: record.summary,
      occurredAt: record.eventDate.toISOString().slice(0, 10),
      occurredAtLabel: record.eventDate.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "Asia/Kathmandu" }),
      provenance: "USER_CONFIRMED" as const,
      kind: record.recordType,
      recordType: record.recordType,
      providerName: record.providerName,
      medications: record.structuredData.medications.map((medication) => ({ name: medication.name, instructions: medication.instructions ?? null })),
      sourceDocument: record.sourceDocument,
      href: "/medical",
    })),
    ...lifeEvents.filter((event) => !event.medicalRecordId).map((event) => ({
      id: event.id,
      category: event.category,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt.toISOString().slice(0, 10),
      occurredAtLabel: event.occurredAt.toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "Asia/Kathmandu" }),
      provenance: "USER_ENTERED" as const,
      kind: getStringMetadata(event.metadata, "kind"),
      recordType: null,
      providerName: null,
      medications: [],
      sourceDocument: event.sourceDocumentId && event.sourceFileName ? { id: event.sourceDocumentId, originalFileName: event.sourceFileName, available: event.sourceAvailable } : null,
      href: "/timeline",
    })),
  ];

  return <div className="grid gap-8">
    <section className="dashboard-hero relative overflow-hidden rounded-[2rem] bg-ink p-7 text-white sm:p-10">
      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
        <div><p className="eyebrow text-emerald-200">ONE USEFUL STEP AT A TIME</p><h1 className="mt-4 max-w-2xl text-4xl font-medium tracking-[-0.045em] sm:text-5xl">Your life information should help you act.</h1><p className="mt-4 max-w-xl leading-7 text-white/65">LifeOS turns records and plans into sourced answers, preparation, and a history you control.</p><Link href={nextAction.href} className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink shadow-xl transition hover:-translate-y-0.5"><span><span className="block">{nextAction.label}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{nextAction.detail}</span></span><ArrowRight className="size-4"/></Link></div>
        <aside className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur"><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-200">Your foundation</p><dl className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-1"><Stat value={documents.length} label="private sources"/><Stat value={medicalRecords.length} label="confirmed health records"/><Stat value={lifeEvents.length} label="timeline events"/></dl></aside>
      </div>
      <div className="dashboard-orb" aria-hidden="true"/>
    </section>

    <LifeGuide facts={guideFacts}/>

    <section>
      <div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">BUILD YOUR LIFEOS</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Useful paths, not busywork</h2></div><Link href="/documents" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:flex">Private documents <ArrowUpRight className="size-4"/></Link></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(({ href, icon: Icon, title, text, tone }) => <Link href={href} key={href} className="action-card group"><span className={`action-icon action-icon--${tone}`}><Icon className="size-5"/></span><span className="min-w-0"><strong className="block text-sm font-semibold">{title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{text}</span></span><ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"/></Link>)}</div>
    </section>

    <aside className="flex gap-4 rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm"><ShieldCheck className="size-5"/></span><div><p className="text-sm font-semibold">Helpful intelligence must remain accountable.</p><p className="mt-1 text-sm leading-6 text-muted-foreground">LifeOS shows the source and status of important facts, asks before using external AI, and leaves medical, financial, and legal decisions with people and qualified professionals.</p></div></aside>
  </div>;
}

function getStringMetadata(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null || !(key in value)) return null;
  const candidate = value[key as keyof typeof value];
  return typeof candidate === "string" ? candidate : null;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="min-w-0"><dt className="text-xs leading-4 text-white/55">{label}</dt><dd className="mt-1 flex items-center gap-2 text-lg font-semibold"><FileCheck2 className="size-4 text-emerald-300"/>{value}</dd></div>;
}
