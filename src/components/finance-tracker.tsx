"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateSavingsGoal, summarizeFinanceMonth, type FinanceRecord } from "@/lib/finance";
import { financeInputSchema, type FinanceInput } from "@/validation/finance";

type FinanceKind = FinanceInput["kind"];
type Editor = { kind: FinanceKind; record?: FinanceRecord };
const labels: Record<FinanceKind, { plural: string; singular: string; add: string }> = {
  TRANSACTION: { plural: "Income & expenses", singular: "transaction", add: "Add income or expense" },
  BUDGET: { plural: "Monthly budgets", singular: "budget allocation", add: "Add budget allocation" },
  SAVINGS_GOAL: { plural: "Savings goals", singular: "savings goal", add: "Add savings goal" },
};
const money = (value: number) => new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", currencyDisplay: "code", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
const dateLabel = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-NP", { dateStyle: "medium", timeZone: "Asia/Kathmandu" });
const inputClassName = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

export function FinanceTracker({ records, invalidRecordCount = 0, today }: { records: FinanceRecord[]; invalidRecordCount?: number; today: string }) {
  const router = useRouter();
  const requestPending = useRef(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [kind, setKind] = useState<FinanceKind>("TRANSACTION");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const summary = summarizeFinanceMonth(records, month);
  const visibleRecords = records.filter((record) => record.kind === kind && (record.kind === "SAVINGS_GOAL" || (record.kind === "BUDGET" ? record.month === month : record.date.startsWith(month))));
  const categories = Array.from(new Set(records.flatMap((record) => record.kind === "SAVINGS_GOAL" ? [] : [record.category]))).sort();

  async function save(input: FinanceInput, recordId?: string) {
    if (requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    setMessage("");
    setHasError(false);
    try {
      const response = await fetch(recordId ? `/api/finance/records/${recordId}` : "/api/finance/records", {
        method: recordId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not save this finance entry.");
      setEditor(null);
      setMessage(recordId ? "Your finance entry was updated." : "Saved to your private finance history.");
      if (input.kind === "BUDGET") setMonth(input.month);
      if (input.kind === "TRANSACTION") setMonth(input.date.slice(0, 7));
      router.refresh();
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Could not save this entry. Your draft is still here.");
    } finally { requestPending.current = false; setBusy(false); }
  }

  async function remove(record: FinanceRecord) {
    if (requestPending.current) return;
    if (!window.confirm(`Delete “${record.title}” from Finance and your timeline? Any source document will remain in Documents.`)) return;
    requestPending.current = true;
    setBusy(true);
    setMessage("");
    setHasError(false);
    try {
      const response = await fetch(`/api/finance/records/${record.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not delete this finance entry.");
      setMessage("The finance entry was deleted.");
      router.refresh();
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Could not delete this finance entry.");
    } finally { requestPending.current = false; setBusy(false); }
  }

  return <section className="grid gap-5" aria-label="Personal finance tracker" aria-busy={busy}>
    {invalidRecordCount > 0 && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{invalidRecordCount} saved finance {invalidRecordCount === 1 ? "entry could" : "entries could"} not be read. Totals exclude {invalidRecordCount === 1 ? "it" : "them"}; the original entries remain stored.</p>}
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card p-5">
      <div><h2 className="text-lg font-semibold">Your monthly overview</h2><p className="mt-1 text-xs text-muted-foreground">Calculated from the amounts you entered, in Nepalese rupees.</p></div>
      <label className="text-sm font-medium">Month<input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} disabled={busy || editor !== null} className={inputClassName}/></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-3"><MoneySummary label="Recorded income" amount={summary.income}/><MoneySummary label="Recorded expenses" amount={summary.expenses}/><MoneySummary label="Income less expenses" amount={summary.net}/></div>
    <div className="flex flex-wrap gap-2" aria-label="Finance sections">
      {(Object.keys(labels) as FinanceKind[]).map((value) => <Button key={value} type="button" variant={kind === value ? "default" : "outline"} aria-pressed={kind === value} onClick={() => { if (!requestPending.current) { setKind(value); setMessage(""); } }} disabled={busy || editor !== null}>{labels[value].plural}</Button>)}
    </div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">{labels[kind].plural}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{kind === "TRANSACTION" ? "Keep a record of money received and spent. You can correct or delete any entry." : kind === "BUDGET" ? "Allocations for the same month and category add together. Expenses use matching category names; another allocation increases that category’s budget." : "Track the amount you have saved and the next contribution. These calculations assume no interest or investment return."}</p></div>
      {!editor && <Button type="button" onClick={() => { setEditor({ kind }); setMessage(""); }} disabled={busy}><Plus className="mr-1.5 size-4"/>{labels[kind].add}</Button>}
    </div>
    {editor && <FinanceEditor key={editor.record?.id ?? `new-${editor.kind}`} editor={editor} month={month} today={today} categories={categories} busy={busy} onSave={save} onCancel={() => { setEditor(null); setMessage(""); }}/>} 
    {message && <p role="status" className={`rounded-xl border p-4 text-sm ${hasError ? "border-red-200 bg-red-50 text-red-800" : "bg-card text-muted-foreground"}`}>{message}</p>}
    {kind === "BUDGET" && <div className="grid gap-4 rounded-xl border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2"><MoneySummary label="Total monthly allocations" amount={summary.budgetLimit}/><MoneySummary label={summary.budgetRemaining < 0 ? "Expenses above total allocations" : "Allocations less recorded expenses"} amount={Math.abs(summary.budgetRemaining)}/></div>
      {summary.categories.length > 0 && <dl className="grid gap-3">{summary.categories.map((category) => <div key={category.category} className="flex flex-wrap items-start justify-between gap-2 border-t pt-3 text-sm"><dt className="font-medium">{category.category}</dt><dd className="text-xs leading-5 text-muted-foreground">{category.hasBudget ? `Allocated ${money(category.budgetLimit)}` : "No allocation"} · Spent {money(category.expenses)} · {category.budgetRemaining < 0 ? `${money(Math.abs(category.budgetRemaining))} over allocation` : `${money(category.budgetRemaining)} remaining`}</dd></div>)}</dl>}
    </div>}
    {visibleRecords.length ? <div className="grid gap-3">{visibleRecords.map((record) => <article key={record.id} className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">User entered · {record.kind === "TRANSACTION" ? `${record.direction === "INCOME" ? "Income" : "Expense"} · ${dateLabel(record.date)}` : record.kind === "BUDGET" ? `Allocation · ${record.month}` : "Savings goal"}</p><h3 className="mt-2 font-semibold">{record.title}</h3></div><div className="flex gap-1"><Button type="button" variant="ghost" className="h-9 px-3" aria-label={`Edit ${record.title}`} onClick={() => { setEditor({ kind: record.kind, record }); setMessage(""); }} disabled={busy || editor !== null}><Pencil className="mr-1.5 size-3.5"/>Edit</Button><Button type="button" variant="ghost" className="h-9 px-3 text-red-700" aria-label={`Delete ${record.title}`} onClick={() => remove(record)} disabled={busy || editor !== null}><Trash2 className="mr-1.5 size-3.5"/>Delete</Button></div></div>
      {record.kind === "SAVINGS_GOAL" ? <SavingsProgress record={record} today={today}/> : <p className="mt-3 text-lg font-semibold">{money(record.kind === "TRANSACTION" ? record.amount : record.limit)} <span className="text-sm font-normal text-muted-foreground">· {record.category}</span></p>}
      {record.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{record.notes}</p>}
    </article>)}</div> : <div className="empty-state"><p className="font-medium text-foreground">{kind === "SAVINGS_GOAL" ? "No savings goals yet." : `No ${kind === "TRANSACTION" ? "income or expenses" : "budget allocations"} for ${month}.`}</p><p className="mt-1">{kind === "SAVINGS_GOAL" ? "Choose one goal and enter its target and what you have already saved." : kind === "BUDGET" ? "Add an allocation for a category such as food, transport, or housing." : "Start with one income or expense you want to keep track of."}</p></div>}
  </section>;
}

function MoneySummary({ label, amount }: { label: string; amount: number }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words text-xl font-semibold">{money(amount)}</p></div>;
}

function SavingsProgress({ record, today }: { record: Extract<FinanceRecord, { kind: "SAVINGS_GOAL" }>; today: string }) {
  const result = calculateSavingsGoal(record, today);
  return <div className="mt-4 grid gap-3">
    <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{money(record.currentAmount)} saved of {money(record.targetAmount)}</span><span>{result.progressPercent.toFixed(1)}%</span></div>
    <progress value={Math.min(result.progressPercent, 100)} max={100} aria-label={`Progress toward ${record.title}`} className="h-2 w-full accent-primary"/>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">Remaining to save</dt><dd className="mt-1 font-medium">{money(result.remaining)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Target date</dt><dd className="mt-1 font-medium">{dateLabel(record.targetDate)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Planned monthly contribution</dt><dd className="mt-1 font-medium">{money(record.monthlyContribution)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Monthly saving needed for target</dt><dd className="mt-1 font-medium">{result.requiredMonthlySaving === null ? result.isOverdue ? "Target date has passed" : "Remaining amount is needed this month" : money(result.requiredMonthlySaving)}</dd></div>
    </dl>
    <p className="text-xs leading-5 text-muted-foreground">{result.remaining === 0 ? "Your recorded savings have reached this target." : result.monthsAtPlannedContribution === null ? "Set a monthly contribution to estimate how long reaching the goal could take." : `At your planned contribution, the remaining amount takes about ${result.monthsAtPlannedContribution} month${result.monthsAtPlannedContribution === 1 ? "" : "s"}.`}{result.monthsRemaining > 0 ? ` The deadline estimate divides the remaining amount across ${result.monthsRemaining} future calendar month${result.monthsRemaining === 1 ? "" : "s"}, including the target month.` : ""} No interest or investment returns are included. Saved amounts are entered by you.</p>
  </div>;
}

function FinanceEditor({ editor, month, today, categories, busy, onSave, onCancel }: {
  editor: Editor; month: string; today: string; categories: string[]; busy: boolean;
  onSave: (input: FinanceInput, recordId?: string) => Promise<void>; onCancel: () => void;
}) {
  const categoriesId = useId();
  const [error, setError] = useState("");
  const { kind, record } = editor;
  const transaction = record?.kind === "TRANSACTION" ? record : null;
  const budget = record?.kind === "BUDGET" ? record : null;
  const goal = record?.kind === "SAVINGS_GOAL" ? record : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formData = new FormData(event.currentTarget);
    const text = (key: string) => String(formData.get(key) ?? "");
    const common = { kind, title: text("title"), notes: text("notes") || undefined, currency: "NPR" };
    const input = financeInputSchema.safeParse({ ...common, ...(kind === "TRANSACTION"
      ? { direction: text("direction"), amount: Number(text("amount")), date: text("date"), category: text("category") }
      : kind === "BUDGET" ? { month: text("month"), category: text("category"), limit: Number(text("limit")) }
      : { targetAmount: Number(text("targetAmount")), currentAmount: Number(text("currentAmount")), monthlyContribution: Number(text("monthlyContribution")), targetDate: text("targetDate") }) });
    if (!input.success) { setError(input.error.issues[0]?.message ?? "Check the fields and try again."); return; }
    setError("");
    await onSave(input.data, record?.id);
  }

  return <form onSubmit={submit} className="grid gap-4 rounded-xl border border-primary/30 bg-card p-5" aria-label={`${record ? "Edit" : "Add"} ${labels[kind].singular}`}>
    <fieldset disabled={busy} className="grid min-w-0 gap-4">
      <legend className="mb-4 font-semibold">{record ? "Edit" : "Add"} {labels[kind].singular}</legend>
      <label className="text-sm font-medium">Title<input name="title" defaultValue={record?.title ?? ""} maxLength={200} required autoFocus className={inputClassName} placeholder={kind === "TRANSACTION" ? "e.g. Groceries or monthly salary" : kind === "BUDGET" ? "e.g. Food allocation" : "e.g. Emergency savings"}/></label>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "TRANSACTION" && <>
          <label className="text-sm font-medium">Type<select name="direction" defaultValue={transaction?.direction ?? "EXPENSE"} className={inputClassName}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
          <AmountField name="amount" label="Amount (NPR)" value={transaction?.amount} positive/>
          <label className="text-sm font-medium">Date<input name="date" type="date" defaultValue={transaction?.date ?? (month === today.slice(0, 7) ? today : `${month}-01`)} required className={inputClassName}/></label>
        </>}
        {kind === "BUDGET" && <>
          <label className="text-sm font-medium">Budget month<input name="month" type="month" defaultValue={budget?.month ?? month} required className={inputClassName}/></label>
          <AmountField name="limit" label="Allocation (NPR)" value={budget?.limit}/>
        </>}
        {kind !== "SAVINGS_GOAL" && <label className="text-sm font-medium">Category<input name="category" list={categoriesId} defaultValue={transaction?.category ?? budget?.category ?? ""} maxLength={80} required placeholder="e.g. food, transport, salary" className={inputClassName}/><datalist id={categoriesId}>{categories.map((category) => <option key={category} value={category}/>)}</datalist><span className="mt-1 block text-xs font-normal text-muted-foreground">Use the same category for a budget and its expenses. Names are saved in lowercase.</span></label>}
        {kind === "SAVINGS_GOAL" && <>
          <AmountField name="targetAmount" label="Target amount (NPR)" value={goal?.targetAmount} positive/>
          <AmountField name="currentAmount" label="Saved so far (NPR)" value={goal?.currentAmount ?? 0}/>
          <AmountField name="monthlyContribution" label="Planned monthly contribution (NPR)" value={goal?.monthlyContribution ?? 0}/>
          <label className="text-sm font-medium">Target date<input name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""} required className={inputClassName}/></label>
        </>}
      </div>
      <label className="text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span><textarea name="notes" defaultValue={record?.notes ?? ""} rows={3} maxLength={2000} className={inputClassName}/></label>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : record ? "Save changes" : `Save ${labels[kind].singular}`}</Button><Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button></div>
    </fieldset>
    {error && <p role="status" className="text-sm text-red-700">{error}</p>}
  </form>;
}

function AmountField({ name, label, value, positive = false }: { name: string; label: string; value?: number; positive?: boolean }) {
  return <label className="text-sm font-medium">{label}<input name={name} type="number" inputMode="decimal" min={positive ? "0.01" : "0"} max="1000000000" step="0.01" defaultValue={value ?? ""} required className={inputClassName}/></label>;
}
