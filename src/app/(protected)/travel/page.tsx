import { LifePlanWorkspace } from "@/components/life-plan-workspace";
import { Map } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default function Page() { return <div className="grid gap-6"><PageHero eyebrow="TRAVEL" title="Plan a trip" description="Keep routes, lodging, estimated costs, contacts, and safety notes together." icon={Map} tone="blue" status="Verify live conditions before travel" /><DocumentUploadForm category="TRAVEL" title="Add a travel source" description="Store tickets, reservations, or itinerary documents privately. Verify live conditions separately." /><LifePlanWorkspace kind="TRIP" title="Your saved trips" dateLabel="Departure date" descriptionLabel="Route, lodging, cost estimate, contacts, and safety notes" submitLabel="Save trip plan" /><aside className="rounded-xl border bg-sky-50/70 p-4 text-sm text-muted-foreground">LifeOS stores your plan; it does not claim live road closures, weather, prices, or official safety status.</aside></div>; }
