import Link from "next/link";
import { AppointmentPreparation } from "@/components/appointment-preparation";
import { LifeEntryForm } from "@/components/life-entry-form";
import { CalendarDays } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { requirePageUser } from "@/lib/auth/adapter";
import { listMedicalRecordsForUser } from "@/repositories/medical-records";

export default async function Page() {
  const user = await requirePageUser();
  const records = await listMedicalRecordsForUser(user.id);

  return <div className="grid gap-6">
    <PageHero eyebrow="APPOINTMENTS" title="Arrive with your history ready" description="Bring selected health records and your questions together, and keep the appointment date in your timeline." icon={CalendarDays} tone="rose" status="Preparation only · Book directly with your provider"/>
    <AppointmentPreparation records={records.filter((record) => record.verificationStatus === "USER_CONFIRMED").map((record) => ({
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
    <details className="rounded-2xl border bg-white/35 p-2">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Save an appointment date</summary>
      <div className="grid gap-3 pt-2">
        <LifeEntryForm kind="APPOINTMENT" dateLabel="Date and time" descriptionLabel="Place, purpose, contact, and preparation" submitLabel="Save appointment"/>
        <Link href="/timeline" className="px-4 pb-2 text-sm font-medium text-primary hover:underline">View saved dates in your timeline</Link>
      </div>
    </details>
  </div>;
}
