import { LifeEntryForm } from "@/components/life-entry-form";
import { Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function Page() { return <div className="grid gap-6"><PageHero eyebrow="MEMORIES" title="Keep what matters" description="Record a memory deliberately. LifeOS never monitors your camera, microphone, or location." icon={Sparkles} tone="sand" status="Saved only when you choose" /><LifeEntryForm kind="MEMORY" descriptionLabel="What you want to remember" submitLabel="Save memory" /></div>; }
