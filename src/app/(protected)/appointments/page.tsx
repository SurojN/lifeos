import { LifeEntryForm } from "@/components/life-entry-form";
import { CalendarDays } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function Page() { return <div className="grid gap-6"><PageHero eyebrow="APPOINTMENTS" title="Remember the next appointment" description="Record the time, place, purpose, and preparation notes in one calm place." icon={CalendarDays} tone="rose" status="No automatic booking or notifications" /><LifeEntryForm kind="APPOINTMENT" dateLabel="Date and time" descriptionLabel="Place, purpose, contact, and preparation" submitLabel="Save appointment" /></div>; }
