import { LifeEntryForm } from "@/components/life-entry-form";
import { GraduationCap } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function Page() { return <div className="grid gap-6"><PageHero eyebrow="LEARNING & GOALS" title="Choose the next useful step" description="Keep a goal, target date, motivation, and next action without engagement tricks." icon={GraduationCap} tone="violet" status="One clear next action" /><LifeEntryForm kind="LEARNING_GOAL" dateLabel="Target date" descriptionLabel="Why it matters and the next action" submitLabel="Save learning goal" /></div>; }
