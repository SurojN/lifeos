import assert from "node:assert/strict";
import test from "node:test";
import { futureValue, inflationAdjusted } from "../src/domain/calculations.ts";

test("futureValue handles a zero-return contribution plan", () => {
  assert.equal(futureValue({ currentAge: 30, retirementAge: 31, currentSavings: 1000, monthlyContribution: 100, expectedAnnualReturn: 0, expectedInflation: 0, desiredMonthlyExpense: 0 }), 2200);
});

test("futureValue does not project negative time", () => {
  assert.equal(futureValue({ currentAge: 65, retirementAge: 60, currentSavings: 1000, monthlyContribution: 100, expectedAnnualReturn: 10, expectedInflation: 6, desiredMonthlyExpense: 0 }), 1000);
});

test("inflationAdjusted converts a future value into today's value", () => {
  assert.ok(Math.abs(inflationAdjusted(121, 10, 2) - 100) < Number.EPSILON * 100);
});
