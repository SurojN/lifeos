import { financeDateSchema, financeMonthSchema, type FinanceInput, type SavingsGoalInput } from "@/validation/finance";

export type FinanceRecord = FinanceInput & { id: string };

export type FinanceCategorySummary = {
  category: string;
  expenses: number;
  budgetLimit: number;
  budgetRemaining: number;
  hasBudget: boolean;
};

export type FinanceMonthSummary = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  budgetLimit: number;
  budgetRemaining: number;
  categories: FinanceCategorySummary[];
};

export type SavingsGoalProgress = {
  remaining: number;
  progressPercent: number;
  monthsRemaining: number;
  requiredMonthlySaving: number | null;
  monthsAtPlannedContribution: number | null;
  isOverdue: boolean;
};

const toPaisa = (amount: number) => Math.round(amount * 100);
const toNpr = (paisa: number) => paisa / 100;

function addPaisa(left: number, right: number): number {
  const sum = left + right;
  if (!Number.isSafeInteger(sum)) throw new RangeError("The finance total exceeds supported precision.");
  return sum;
}

/** Input records have already passed financeInputSchema. Amounts returned are NPR. */
export function summarizeFinanceMonth(records: readonly FinanceRecord[], month: string): FinanceMonthSummary {
  financeMonthSchema.parse(month);
  let income = 0;
  let expenses = 0;
  let budgetLimit = 0;
  const categories = new Map<string, { expenses: number; budgetLimit: number; hasBudget: boolean }>();
  const categoryTotal = (category: string) => {
    let total = categories.get(category);
    if (!total) {
      total = { expenses: 0, budgetLimit: 0, hasBudget: false };
      categories.set(category, total);
    }
    return total;
  };

  for (const record of records) {
    if (record.kind === "TRANSACTION" && record.date.slice(0, 7) === month) {
      const amount = toPaisa(record.amount);
      if (record.direction === "INCOME") {
        income = addPaisa(income, amount);
      } else {
        expenses = addPaisa(expenses, amount);
        const category = categoryTotal(record.category);
        category.expenses = addPaisa(category.expenses, amount);
      }
    } else if (record.kind === "BUDGET" && record.month === month) {
      const amount = toPaisa(record.limit);
      budgetLimit = addPaisa(budgetLimit, amount);
      const category = categoryTotal(record.category);
      category.budgetLimit = addPaisa(category.budgetLimit, amount);
      category.hasBudget = true;
    }
  }

  return {
    month,
    income: toNpr(income),
    expenses: toNpr(expenses),
    net: toNpr(income - expenses),
    budgetLimit: toNpr(budgetLimit),
    budgetRemaining: toNpr(budgetLimit - expenses),
    categories: [...categories].sort(([left], [right]) => left.localeCompare(right)).map(([category, total]) => ({
      category,
      expenses: toNpr(total.expenses),
      budgetLimit: toNpr(total.budgetLimit),
      budgetRemaining: toNpr(total.budgetLimit - total.expenses),
      hasBudget: total.hasBudget,
    })),
  };
}

/**
 * Zero-interest arithmetic, with one contribution in each future calendar month
 * from the month after asOf through the target month, inclusive. No contribution
 * is assumed in the current month. With no future months, an unmet goal returns
 * null for requiredMonthlySaving: its remaining balance is needed now.
 */
export function calculateSavingsGoal(goal: SavingsGoalInput, asOf: string): SavingsGoalProgress {
  financeDateSchema.parse(asOf);
  financeDateSchema.parse(goal.targetDate);
  const target = toPaisa(goal.targetAmount);
  const saved = toPaisa(goal.currentAmount);
  const monthly = toPaisa(goal.monthlyContribution);
  const remaining = Math.max(0, target - saved);
  const [currentYear, currentMonth] = asOf.split("-").map(Number);
  const [targetYear, targetMonth] = goal.targetDate.split("-").map(Number);
  const monthsRemaining = Math.max(0, (targetYear - currentYear) * 12 + targetMonth - currentMonth);

  return {
    remaining: toNpr(remaining),
    progressPercent: Math.min(100, (saved / target) * 100),
    monthsRemaining,
    // Round upward to the next paisa so the proposed contribution covers the goal.
    requiredMonthlySaving: remaining === 0 ? 0 : monthsRemaining === 0 ? null : toNpr(Math.ceil(remaining / monthsRemaining)),
    monthsAtPlannedContribution: remaining === 0 ? 0 : monthly === 0 ? null : Math.ceil(remaining / monthly),
    isOverdue: remaining > 0 && goal.targetDate < asOf,
  };
}
