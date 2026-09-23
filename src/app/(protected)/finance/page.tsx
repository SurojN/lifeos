import { FinancePlanner } from "@/components/finance-planner";
import { FinanceTracker } from "@/components/finance-tracker";
import { Landmark } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { requirePageUser } from "@/lib/auth/adapter";
import { listFinanceRecordsForUser } from "@/services/finance";

export default async function Page() {
  const user = await requirePageUser();
  const { records, invalidRecordCount } = await listFinanceRecordsForUser(user.id);
  const dateParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => dateParts.find((entry) => entry.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;

  return <div className="grid gap-6">
    <PageHero eyebrow="FINANCE" title="Know what you earn, spend, and save" description="Keep income, expenses, monthly budgets, and savings goals together using information you enter." icon={Landmark} tone="sand" status="User-entered amounts · NPR"/>
    <FinanceTracker records={records} invalidRecordCount={invalidRecordCount} today={today}/>
    <details className="rounded-2xl border bg-white/35 p-2">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Store a financial document</summary>
      <div className="pt-2"><DocumentUploadForm category="FINANCE" title="Add a financial source" description="Store statements, receipts, and goal documents privately. You choose what to upload."/></div>
    </details>
    <details className="rounded-2xl border bg-white/35 p-2">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Explore retirement and SIP assumptions</summary>
      <div className="pt-2"><FinancePlanner/></div>
    </details>
  </div>;
}
