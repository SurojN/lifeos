import { describe, expect, it } from "vitest";
import { calculateSavingsGoal, summarizeFinanceMonth, type FinanceRecord } from "@/lib/finance";
import { financeInputSchema, financeDateSchema, financeMonthSchema, savingsGoalSchema, MAX_FINANCE_AMOUNT_NPR } from "@/validation/finance";

const transaction = { kind: "TRANSACTION", title: "Groceries", direction: "EXPENSE", amount: 250.25, date: "2026-09-23", category: "Food" } as const;
const budget = { kind: "BUDGET", title: "Food allowance", month: "2026-09", category: "Food", limit: 500 } as const;
const goal = { kind: "SAVINGS_GOAL", title: "Emergency fund", targetAmount: 10_000, currentAmount: 1_000, monthlyContribution: 500, targetDate: "2027-03-01" } as const;
const record = (id: string, input: unknown): FinanceRecord => ({ id, ...financeInputSchema.parse(input) });

describe("finance input validation", () => {
  it("normalizes categories and text and defaults the currency to NPR", () => {
    expect(financeInputSchema.parse({ ...transaction, title: "  Groceries  ", category: " FOOD ", notes: "  Receipt checked  " }))
      .toEqual({ ...transaction, title: "Groceries", category: "food", currency: "NPR", notes: "Receipt checked" });
  });

  it.each([0.01, 0.1, 1.1, 10.29, MAX_FINANCE_AMOUNT_NPR])("accepts exact two-decimal NPR amounts such as %s", (amount) => {
    expect(financeInputSchema.parse({ ...transaction, amount })).toMatchObject({ amount });
  });

  it.each([0, -1, 0.001, 1.234, 0.1 + 0.2, NaN, Infinity, MAX_FINANCE_AMOUNT_NPR + 1, "100", null])("rejects invalid transaction amount %s", (amount) => {
    expect(financeInputSchema.safeParse({ ...transaction, amount }).success).toBe(false);
  });

  it("allows zero budget/saved/contribution but requires a positive goal target", () => {
    expect(financeInputSchema.safeParse({ ...budget, limit: 0 }).success).toBe(true);
    expect(financeInputSchema.safeParse({ ...goal, currentAmount: 0, monthlyContribution: 0 }).success).toBe(true);
    expect(financeInputSchema.safeParse({ ...goal, targetAmount: 0 }).success).toBe(false);
  });

  it("allows saved money above the target, without silently reducing it", () => {
    expect(financeInputSchema.parse({ ...goal, currentAmount: 12_000 })).toMatchObject({ currentAmount: 12_000 });
  });

  it("rejects unknown fields, unsupported currencies and unbounded text", () => {
    for (const input of [
      { ...transaction, userId: "another-owner" },
      { ...transaction, currency: "USD" },
      { ...transaction, title: " " },
      { ...transaction, title: "x".repeat(201) },
      { ...transaction, notes: "x".repeat(2001) },
      { ...budget, category: " " },
      { ...budget, category: "x".repeat(81) },
      { ...goal, direction: "INCOME" },
    ]) expect(financeInputSchema.safeParse(input).success).toBe(false);
  });

  it("validates actual calendar dates and months including leap years", () => {
    expect(financeDateSchema.parse("2024-02-29")).toBe("2024-02-29");
    expect(financeDateSchema.parse("2000-02-29")).toBe("2000-02-29");
    for (const date of ["2026-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-02", "1899-12-31", "2026-09-23T12:00:00Z"]) {
      expect(financeDateSchema.safeParse(date).success).toBe(false);
    }
    expect(financeMonthSchema.parse("2026-09")).toBe("2026-09");
    for (const month of ["2026-13", "2026-00", "2026-9", "2026-09-01"]) expect(financeMonthSchema.safeParse(month).success).toBe(false);
    expect(financeInputSchema.safeParse({ ...transaction, date: "2026-02-30" }).success).toBe(false);
    expect(financeInputSchema.safeParse({ ...goal, targetDate: "2026-02-30" }).success).toBe(false);
    expect(financeInputSchema.safeParse({ ...budget, month: "2026-13" }).success).toBe(false);
  });
});

describe("monthly income, expenses and additive budgets", () => {
  it("sums paisa exactly, combines allocations, isolates months, and includes unbudgeted expenses", () => {
    const records = [
      record("income", { ...transaction, direction: "INCOME", category: "salary", amount: 1_000 }),
      record("expense-1", { ...transaction, amount: 0.1 }),
      record("expense-2", { ...transaction, amount: 0.2, category: " FOOD " }),
      record("expense-3", { ...transaction, amount: 200, category: "travel" }),
      record("allocation-1", { ...budget, limit: 0.1 }),
      record("allocation-2", { ...budget, limit: 0.2 }),
      record("unused-allocation", { ...budget, category: "health", limit: 50 }),
      record("zero-allocation", { ...budget, category: "other", limit: 0 }),
      record("old-expense", { ...transaction, date: "2026-08-31", amount: 999 }),
      record("old-budget", { ...budget, month: "2026-08", limit: 999 }),
      record("goal", goal),
    ];
    expect(summarizeFinanceMonth(records, "2026-09")).toEqual({
      month: "2026-09", income: 1_000, expenses: 200.3, net: 799.7, budgetLimit: 50.3, budgetRemaining: -150,
      categories: [
        { category: "food", expenses: 0.3, budgetLimit: 0.3, budgetRemaining: 0, hasBudget: true },
        { category: "health", expenses: 0, budgetLimit: 50, budgetRemaining: 50, hasBudget: true },
        { category: "other", expenses: 0, budgetLimit: 0, budgetRemaining: 0, hasBudget: true },
        { category: "travel", expenses: 200, budgetLimit: 0, budgetRemaining: -200, hasBudget: false },
      ],
    });
  });

  it("returns an explicit empty month and shows negative cash flow", () => {
    expect(summarizeFinanceMonth([], "2026-09")).toEqual({ month: "2026-09", income: 0, expenses: 0, net: 0, budgetLimit: 0, budgetRemaining: 0, categories: [] });
    expect(summarizeFinanceMonth([record("expense", transaction)], "2026-09").net).toBe(-250.25);
    expect(() => summarizeFinanceMonth([], "2026-13")).toThrow();
  });

  it("does not change its input records", () => {
    const entry = Object.freeze(record("expense", transaction));
    const records = Object.freeze([entry]);
    expect(summarizeFinanceMonth(records, "2026-09").expenses).toBe(250.25);
    expect(records[0]).toBe(entry);
  });
});

describe("zero-interest savings goal arithmetic", () => {
  it("counts future calendar months across a year boundary", () => {
    expect(calculateSavingsGoal(savingsGoalSchema.parse(goal), "2026-09-23")).toEqual({
      remaining: 9_000, progressPercent: 10, monthsRemaining: 6, requiredMonthlySaving: 1_500, monthsAtPlannedContribution: 18, isOverdue: false,
    });
  });

  it("rounds the required contribution up to a paisa and the number of contributions up to a month", () => {
    const result = calculateSavingsGoal(savingsGoalSchema.parse({ ...goal, targetAmount: 1, currentAmount: 0, monthlyContribution: 0.3, targetDate: "2026-12-01" }), "2026-09-30");
    expect(result.requiredMonthlySaving).toBe(0.34);
    expect(result.monthsAtPlannedContribution).toBe(4);
    expect(result.monthsRemaining).toBe(3);
  });

  it("does not invent a completion month when the planned contribution is zero", () => {
    const result = calculateSavingsGoal(savingsGoalSchema.parse({ ...goal, monthlyContribution: 0 }), "2026-09-23");
    expect(result.monthsAtPlannedContribution).toBeNull();
    expect(result.requiredMonthlySaving).toBe(1_500);
  });

  it("marks overdue targets and distinguishes a remaining balance due this month", () => {
    const parsed = savingsGoalSchema.parse({ ...goal, targetDate: "2026-09-30" });
    expect(calculateSavingsGoal(parsed, "2026-09-23")).toMatchObject({ monthsRemaining: 0, requiredMonthlySaving: null, isOverdue: false });
    expect(calculateSavingsGoal(parsed, "2026-09-30")).toMatchObject({ monthsRemaining: 0, requiredMonthlySaving: null, isOverdue: false });
    expect(calculateSavingsGoal(parsed, "2026-10-01")).toMatchObject({ monthsRemaining: 0, requiredMonthlySaving: null, isOverdue: true });
  });

  it("caps completed progress and needs no more contributions even with an old target date", () => {
    const parsed = savingsGoalSchema.parse({ ...goal, currentAmount: 12_000, monthlyContribution: 0 });
    expect(calculateSavingsGoal(parsed, "2028-01-01")).toEqual({ remaining: 0, progressPercent: 100, monthsRemaining: 0, requiredMonthlySaving: 0, monthsAtPlannedContribution: 0, isOverdue: false });
  });
});
