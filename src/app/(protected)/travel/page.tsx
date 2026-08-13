import { LifeEntryForm } from "@/components/life-entry-form";
import { Map } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function Page() { return <div className="grid gap-6"><PageHero eyebrow="TRAVEL" title="Plan a trip" description="Keep routes, lodging, estimated costs, contacts, and safety notes together." icon={Map} tone="blue" status="Verify live conditions before travel" /><LifeEntryForm kind="TRIP" dateLabel="Departure date" descriptionLabel="Route, lodging, cost estimate, contacts, and safety notes" submitLabel="Save trip plan" /><aside className="rounded-xl border bg-sky-50/70 p-4 text-sm text-muted-foreground">LifeOS stores your plan; it does not claim live road closures, weather, prices, or official safety status.</aside></div>; }
