import { FinancePlanner } from "@/components/finance-planner";
import { LifeEntryForm } from "@/components/life-entry-form";
import { Landmark } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default function Page() { return <div className="grid gap-6"><PageHero eyebrow="FINANCE" title="Plan with visible assumptions" description="Explore savings, SIP, retirement, and personal goals without linking a bank account." icon={Landmark} tone="sand" status="Projections, never guarantees" /><DocumentUploadForm category="FINANCE" title="Add a financial source" description="Store statements, goal documents, or receipts privately. LifeOS does not execute trades or move money." /><FinancePlanner /><div><h2 className="mb-3 text-lg font-medium tracking-tight">Record a financial goal</h2><LifeEntryForm kind="FINANCIAL_GOAL" dateLabel="Target date" descriptionLabel="Target amount, purpose, and assumptions" submitLabel="Save financial goal" /></div></div>; }
