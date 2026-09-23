import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { VersionedEncryption } from "@/lib/security/encryption";
import { AuditFailureError, AuthorizationError } from "@/lib/security/errors";
import { FinanceService } from "@/services/finance";

const userId = "clh1234567890abcdefghijklm";
const recordId = "clh1234567890abcdefghijklmn";
const sourceId = "clh1234567890abcdefghijklo";
const encryption = new VersionedEncryption(`v1:${randomBytes(32).toString("base64")}`);
const transactionInput = { kind: "TRANSACTION", title: "Private groceries", notes: "Receipt details", direction: "EXPENSE", amount: 1500.25, date: "2026-09-10", category: "groceries", currency: "NPR" };
const budgetInput = { kind: "BUDGET", title: "Food allocation", month: "2026-09", category: "groceries", limit: 15000, currency: "NPR" };
const goalInput = { kind: "SAVINGS_GOAL", title: "Emergency reserve", targetAmount: 100000, currentAmount: 20000, monthlyContribution: 5000, targetDate: "2027-12-01", currency: "NPR" };

type Row = {
  id: string; userId: string; category: string; medicalRecordId: string | null; sourceDocumentId: string | null;
  deletedAt: Date | null; occurredAt: Date; titleEncrypted: string; descriptionEncrypted: string | null;
  metadataEncrypted: string; verificationStatus: string;
};
type Audit = { action: string; userId: string; actorUserId: string; resourceType: string; resourceId?: string; result: string; metadata: object };
type State = { rows: Row[]; audits: Audit[] };

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: recordId, userId, category: "FINANCE", medicalRecordId: null, sourceDocumentId: sourceId, deletedAt: null,
    occurredAt: new Date("2026-09-10T00:00:00.000Z"), titleEncrypted: encryption.encrypt(transactionInput.title),
    descriptionEncrypted: encryption.encrypt(transactionInput.notes), verificationStatus: "USER_CONFIRMED",
    metadataEncrypted: encryption.encryptJson({ origin: "USER_ENTERED", kind: "FINANCE_TRANSACTION", financeVersion: 1, finance: transactionInput }),
    ...overrides,
  };
}

function fixture(rows: Row[] = [row()]) {
  let state: State = { rows, audits: [] };
  let draft: State | null = null;
  const active = () => {
    if (!draft) throw new Error("Expected an active transaction.");
    return draft;
  };
  const matches = (entry: Row, where: Partial<Row>) => Object.entries(where).every(([key, expected]) => entry[key as keyof Row] === expected);
  const findFirst = vi.fn(async ({ where }: { where: Partial<Row> }) => active().rows.find((entry) => matches(entry, where)) ?? null);
  const findMany = vi.fn(async ({ where }: { where: Partial<Row> }) => active().rows.filter((entry) => matches(entry, where)));
  const create = vi.fn(async ({ data }: { data: Partial<Row> }) => {
    const created = row({ ...data, id: `${recordId}${active().rows.length}`, sourceDocumentId: data.sourceDocumentId ?? null });
    active().rows.push(created);
    return created;
  });
  const updateMany = vi.fn(async ({ where, data }: { where: Partial<Row>; data: Partial<Row> }) => {
    const found = active().rows.filter((entry) => matches(entry, where));
    found.forEach((entry) => Object.assign(entry, data));
    return { count: found.length };
  });
  const audit = vi.fn(async ({ data }: { data: Audit }) => { active().audits.push(data); return data; });
  const transaction = { lifeEvent: { findFirst, findMany, create, updateMany }, auditLog: { create: audit } };
  const transact = vi.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => {
    draft = structuredClone(state);
    try {
      const result = await callback(transaction);
      state = draft;
      return result;
    } finally { draft = null; }
  });
  return {
    service: new FinanceService({ $transaction: transact } as unknown as PrismaClient, encryption),
    get state() { return state; }, findFirst, findMany, create, updateMany, audit, transact,
  };
}

describe("encrypted finance persistence", () => {
  it.each([
    [transactionInput, "FINANCE_TRANSACTION", "2026-09-10"],
    [budgetInput, "FINANCE_BUDGET", "2026-09-01"],
    [goalInput, "SAVINGS_GOAL", "2027-12-01"],
  ] as const)("persists each structured record as an owned, encrypted life event", async (input, kind, date) => {
    const context = fixture([]);
    const result = await context.service.create(userId, input);
    const saved = context.state.rows[0];
    expect(result.recordId).toBe(saved.id);
    expect(saved).toEqual(expect.objectContaining({ userId, category: "FINANCE", medicalRecordId: null, sourceDocumentId: null, occurredAt: new Date(`${date}T00:00:00.000Z`) }));
    expect(encryption.decrypt(saved.titleEncrypted)).toBe(input.title);
    expect(encryption.decryptJson(saved.metadataEncrypted)).toEqual({ origin: "USER_ENTERED", kind, financeVersion: 1, finance: input });
    expect(context.state.audits).toEqual([expect.objectContaining({ action: "finance_record.create", userId, actorUserId: userId, resourceId: saved.id, result: "SUCCESS", metadata: {} })]);
  });

  it("preserves separate additive budget allocations in the same month and category", async () => {
    const context = fixture([]);
    const first = await context.service.create(userId, budgetInput);
    const second = await context.service.create(userId, { ...budgetInput, limit: 500 });
    expect(first.recordId).not.toBe(second.recordId);
    const result = await context.service.list(userId);
    expect(result.records).toHaveLength(2);
    expect(result.invalidRecordCount).toBe(0);
  });

  it("loads only the owner's active nonclinical finance records", async () => {
    const context = fixture([
      row(), row({ id: "foreign", userId: "other-owner" }), row({ id: "deleted", deletedAt: new Date() }),
      row({ id: "health", category: "HEALTH" }), row({ id: "clinical", medicalRecordId: "medical-record" }),
    ]);
    await expect(context.service.list(userId)).resolves.toEqual({ records: [{ ...transactionInput, id: recordId }], invalidRecordCount: 0 });
    expect(context.findMany).toHaveBeenCalledWith({ where: { userId, category: "FINANCE", medicalRecordId: null, deletedAt: null }, select: { id: true, metadataEncrypted: true }, orderBy: { occurredAt: "desc" } });
    expect(context.state.audits[0].action).toBe("finance_record.list");
  });

  it("reports malformed structured records instead of coercing their amounts or counting them in totals", async () => {
    const context = fixture([
      row(),
      row({ id: "bad-amount", metadataEncrypted: encryption.encryptJson({ origin: "USER_ENTERED", kind: "FINANCE_TRANSACTION", financeVersion: 1, finance: { ...transactionInput, amount: "1500oops" } }) }),
      row({ id: "wrong-kind", metadataEncrypted: encryption.encryptJson({ origin: "USER_ENTERED", kind: "FINANCE_BUDGET", financeVersion: 1, finance: transactionInput }) }),
      row({ id: "new-version", metadataEncrypted: encryption.encryptJson({ origin: "USER_ENTERED", kind: "FINANCE_TRANSACTION", financeVersion: 2, finance: transactionInput }) }),
      row({ id: "legacy-general", metadataEncrypted: encryption.encryptJson({ origin: "USER_ENTERED", kind: "FINANCIAL_GOAL" }) }),
    ]);
    await expect(context.service.list(userId)).resolves.toEqual({ records: [{ ...transactionInput, id: recordId }], invalidRecordCount: 3 });
  });

  it("replaces structured fields while preserving the existing source relationship", async () => {
    const context = fixture();
    const originalMetadata = context.state.rows[0].metadataEncrypted;
    const replacement = { ...transactionInput, amount: 1750.50, title: "Corrected groceries", notes: "Corrected receipt" };
    await expect(context.service.replace(userId, recordId, replacement)).resolves.toEqual({ recordId });
    expect(context.state.rows[0].sourceDocumentId).toBe(sourceId);
    expect(encryption.decrypt(context.state.rows[0].titleEncrypted)).toBe(replacement.title);
    expect(encryption.decrypt(context.state.rows[0].descriptionEncrypted!)).toBe(replacement.notes);
    expect(encryption.decryptJson<{ finance: unknown }>(context.state.rows[0].metadataEncrypted).finance).toEqual(replacement);
    expect(context.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: recordId, userId, category: "FINANCE", medicalRecordId: null, deletedAt: null, metadataEncrypted: originalMetadata } }));
    expect(context.state.audits[0].result).toBe("SUCCESS");
  });

  it("soft-deletes a finance entry without deleting or detaching its source", async () => {
    const context = fixture();
    await expect(context.service.delete(userId, recordId)).resolves.toEqual({ recordId, status: "DELETED" });
    expect(context.state.rows[0].deletedAt).toBeInstanceOf(Date);
    expect(context.state.rows[0].sourceDocumentId).toBe(sourceId);
  });

  it.each(["foreign", "missing", "deleted", "non-finance", "medical-relation", "legacy-medical", "wrong-origin", "legacy-general", "malformed"])("denies %s records for edits and deletion", async (kind) => {
    for (const operation of ["replace", "delete"] as const) {
      const context = fixture();
      const saved = context.state.rows[0];
      if (kind === "foreign") saved.userId = "another-owner";
      else if (kind === "missing") context.state.rows.length = 0;
      else if (kind === "deleted") saved.deletedAt = new Date();
      else if (kind === "non-finance") saved.category = "HEALTH";
      else if (kind === "medical-relation") saved.medicalRecordId = "medical-record";
      else {
        const metadata = kind === "legacy-general" ? { origin: "USER_ENTERED", kind: "FINANCIAL_GOAL" }
          : { origin: kind === "wrong-origin" ? "AI_EXTRACTED" : "USER_ENTERED", kind: "FINANCE_TRANSACTION", financeVersion: 1,
            finance: kind === "malformed" ? { ...transactionInput, amount: -10 } : transactionInput,
            ...(kind === "legacy-medical" ? { medicalRecordId: "medical-record" } : {}),
          };
        saved.metadataEncrypted = encryption.encryptJson(metadata);
      }
      const before = structuredClone(context.state.rows);
      const result = operation === "replace" ? context.service.replace(userId, recordId, transactionInput) : context.service.delete(userId, recordId);
      await expect(result).rejects.toBeInstanceOf(AuthorizationError);
      expect(context.state.rows).toEqual(before);
      expect(context.updateMany).not.toHaveBeenCalled();
      expect(context.findFirst).toHaveBeenCalledWith({ where: { id: recordId, userId, category: "FINANCE", medicalRecordId: null, deletedAt: null }, select: { id: true, metadataEncrypted: true } });
      expect(context.state.audits).toEqual([expect.objectContaining({ action: `finance_record.${operation}`, result: "DENIED", metadata: {} })]);
    }
  });

  it.each(["create", "replace", "delete", "list"] as const)("fails %s safely when required audit storage fails", async (operation) => {
    const context = fixture(operation === "create" ? [] : [row()]);
    const before = structuredClone(context.state);
    context.audit.mockRejectedValueOnce(new Error("Audit unavailable"));
    const result = operation === "create" ? context.service.create(userId, transactionInput)
      : operation === "replace" ? context.service.replace(userId, recordId, transactionInput)
        : operation === "delete" ? context.service.delete(userId, recordId) : context.service.list(userId);
    await expect(result).rejects.toBeInstanceOf(AuditFailureError);
    expect(context.transact).toHaveBeenCalledOnce();
    expect(context.state).toEqual(before);
  });

  it("denies a stale mutation without claiming success", async () => {
    const context = fixture();
    context.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(context.service.delete(userId, recordId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(context.state.rows[0].deletedAt).toBeNull();
    expect(context.state.audits[0].result).toBe("DENIED");
  });

  it("validates IDs and refuses ownership, clinical and source fields in input before database access", async () => {
    const context = fixture();
    await expect(context.service.delete(userId, "../another-owner")).rejects.toThrow();
    await expect(context.service.create(userId, { ...transactionInput, userId: "other-owner" })).rejects.toThrow();
    await expect(context.service.create(userId, { ...transactionInput, medicalRecordId: "medical-record" })).rejects.toThrow();
    await expect(context.service.replace(userId, recordId, { ...transactionInput, sourceDocumentId: sourceId })).rejects.toThrow();
    expect(context.transact).not.toHaveBeenCalled();
  });
});
