import type { RetirementPlan } from "./models.ts";

export function futureValue(plan: RetirementPlan): number {
  const months = Math.max(0, (plan.retirementAge - plan.currentAge) * 12);
  const monthlyRate = plan.expectedAnnualReturn / 100 / 12;
  const initial = plan.currentSavings * Math.pow(1 + monthlyRate, months);
  const contributions = monthlyRate === 0
    ? plan.monthlyContribution * months
    : plan.monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return initial + contributions;
}

export function inflationAdjusted(value: number, inflation: number, years: number): number {
  return value / Math.pow(1 + inflation / 100, Math.max(0, years));
}
