"use client";

import { useMemo, useState } from "react";

type Plan = { currentAge: number; retirementAge: number; currentSavings: number; monthlyContribution: number; annualReturn: number; inflation: number };
const initial: Plan = { currentAge: 30, retirementAge: 60, currentSavings: 0, monthlyContribution: 5000, annualReturn: 8, inflation: 6 };
const money = (value: number) => new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

export function FinancePlanner() {
  const [plan, setPlan] = useState(initial);
  const result = useMemo(() => {
    const months = Math.max(0, (plan.retirementAge - plan.currentAge) * 12);
    const rate = plan.annualReturn / 100 / 12;
    const growth = Math.pow(1 + rate, months);
    const future = plan.currentSavings * growth + (rate === 0 ? plan.monthlyContribution * months : plan.monthlyContribution * ((growth - 1) / rate));
    return { years: months / 12, future, today: future / Math.pow(1 + plan.inflation / 100, months / 12) };
  }, [plan]);
  const update = (key: keyof Plan, value: string) => setPlan((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  const fields: [keyof Plan, string][] = [["currentAge", "Current age"], ["retirementAge", "Retirement age"], ["currentSavings", "Current savings (NPR)"], ["monthlyContribution", "Monthly SIP/contribution (NPR)"], ["annualReturn", "Expected annual return (%)"], ["inflation", "Expected inflation (%)"]];
  return <section className="grid gap-5 rounded-xl border bg-card p-6"><div><h2 className="font-semibold">Retirement and SIP projection</h2><p className="mt-1 text-sm text-muted-foreground">A calculation from your assumptions—not a guarantee or investment recommendation.</p></div><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <label className="text-sm" key={key}>{label}<input type="number" min="0" step={key === "annualReturn" || key === "inflation" ? "0.1" : "1"} value={plan[key]} onChange={(event) => update(key, event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2" /></label>)}</div><div className="grid gap-3 rounded-lg bg-muted p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Projected fund in {result.years} years</p><p className="text-xl font-semibold">{money(result.future)}</p></div><div><p className="text-xs text-muted-foreground">Estimated value in today’s money</p><p className="text-xl font-semibold">{money(result.today)}</p></div></div><p className="text-xs text-muted-foreground">Assumes monthly end-of-period contributions and a constant return/inflation rate. Taxes, fees, volatility, and contribution growth are excluded.</p></section>;
}
