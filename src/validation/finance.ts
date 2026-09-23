import { z } from "zod";

export const MAX_FINANCE_AMOUNT_NPR = 1_000_000_000;

export const financeDateSchema = z.string().regex(/^(19\d{2}|[2-9]\d{3})-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Choose a real calendar date between 1900 and 9999.");

export const financeMonthSchema = z.string().regex(/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/, "Use a month in YYYY-MM format.");

const moneySchema = z.number().finite().min(0).max(MAX_FINANCE_AMOUNT_NPR)
  .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(String(value)), "Use at most two decimal places for NPR amounts.");
const positiveMoneySchema = moneySchema.refine((value) => value > 0, "The amount must be greater than zero.");
const categorySchema = z.string().trim().min(1).max(80).transform((value) => value.toLowerCase());
const common = {
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2_000).optional(),
  currency: z.literal("NPR").default("NPR"),
};

export const financeTransactionSchema = z.object({
  ...common,
  kind: z.literal("TRANSACTION"),
  direction: z.enum(["INCOME", "EXPENSE"]),
  amount: positiveMoneySchema,
  date: financeDateSchema,
  category: categorySchema,
}).strict();

export const financeBudgetSchema = z.object({
  ...common,
  kind: z.literal("BUDGET"),
  month: financeMonthSchema,
  category: categorySchema,
  limit: moneySchema,
}).strict();

export const savingsGoalSchema = z.object({
  ...common,
  kind: z.literal("SAVINGS_GOAL"),
  targetAmount: positiveMoneySchema,
  currentAmount: moneySchema,
  monthlyContribution: moneySchema,
  targetDate: financeDateSchema,
}).strict();

export const financeInputSchema = z.discriminatedUnion("kind", [financeTransactionSchema, financeBudgetSchema, savingsGoalSchema]);

export type FinanceTransactionInput = z.output<typeof financeTransactionSchema>;
export type FinanceBudgetInput = z.output<typeof financeBudgetSchema>;
export type SavingsGoalInput = z.output<typeof savingsGoalSchema>;
export type FinanceInput = z.output<typeof financeInputSchema>;
