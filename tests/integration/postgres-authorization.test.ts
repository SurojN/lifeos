import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { AuthorizationError } from "@/lib/security/errors";
import { VersionedEncryption } from "@/lib/security/encryption";
import { PrismaPersonalDataGateway } from "@/repositories/personal-data-gateway";
import { PersonalDataService } from "@/services/personal-data";
import { DocumentUploadService } from "@/services/document-uploads";
import type { PrivateStorage } from "@/lib/storage/types";
import { processClerkWebhook } from "@/services/clerk-webhooks";
import { FinanceService } from "@/services/finance";
import { LifeEventEntryService } from "@/services/life-event-entry";
import { summarizeFinanceMonth } from "@/lib/finance";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const parsedTestDatabaseUrl = testDatabaseUrl ? new URL(testDatabaseUrl) : undefined;
if (!parsedTestDatabaseUrl || !["localhost", "127.0.0.1"].includes(parsedTestDatabaseUrl.hostname) || !parsedTestDatabaseUrl.pathname.toLowerCase().includes("test")) {
  throw new Error("TEST_DATABASE_URL must point to a dedicated local PostgreSQL database.");
}

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
const encryption = new VersionedEncryption(`v1:${randomBytes(32).toString("base64")}`);
let userA: { id: string };
let userB: { id: string };
let documentB: { id: string };
let medicalRecordB: { id: string };
let lifeEventB: { id: string };

beforeAll(async () => {
  await database.auditLog.deleteMany();
  await database.webhookEvent.deleteMany();
  await database.lifeEvent.deleteMany();
  await database.medicalRecord.deleteMany();
  await database.extractionJob.deleteMany();
  await database.documentUpload.deleteMany();
  await database.consentRecord.deleteMany();
  await database.sourceDocument.deleteMany();
  await database.user.deleteMany();

  userA = await database.user.create({ data: { clerkUserId: "integration-clerk-a", email: "a@example.test", displayName: "User A" }, select: { id: true } });
  userB = await database.user.create({ data: { clerkUserId: "integration-clerk-b", email: "b@example.test", displayName: "User B" }, select: { id: true } });
  documentB = await database.sourceDocument.create({ data: { userId: userB.id, originalFileNameEncrypted: encryption.encrypt("user-b-report.pdf"), storageKey: `users/${userB.id}/documents/report.pdf`, mimeType: "application/pdf", sizeBytes: 100, checksum: "a".repeat(64), category: "HEALTH", status: "AVAILABLE" }, select: { id: true } });
  medicalRecordB = await database.medicalRecord.create({ data: { userId: userB.id, sourceDocumentId: documentB.id, recordType: "REPORT", eventDate: new Date("2026-01-01"), titleEncrypted: encryption.encrypt("Private title"), structuredDataEncrypted: encryption.encryptJson({ private: true }) }, select: { id: true } });
  lifeEventB = await database.lifeEvent.create({ data: { userId: userB.id, sourceDocumentId: documentB.id, category: "HEALTH", titleEncrypted: encryption.encrypt("Private event"), occurredAt: new Date("2026-01-01"), metadataEncrypted: encryption.encryptJson({ private: true }) }, select: { id: true } });
  await database.consentRecord.createMany({ data: [{ userId: userA.id, consentType: "privacy", policyVersion: "1", granted: true }, { userId: userB.id, consentType: "medical", policyVersion: "1", granted: true }] });
});

afterAll(async () => { await database.$disconnect(); });

describe("real PostgreSQL tenant authorization", () => {
  it("prevents User A from reading User B's source document", async () => {
    const service = new PersonalDataService(userA.id, new PrismaPersonalDataGateway(database, encryption));
    await expect(service.findDocument(documentB.id)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("prevents User A from updating User B's medical record", async () => {
    const service = new PersonalDataService(userA.id, new PrismaPersonalDataGateway(database, encryption));
    await expect(service.updateMedicalRecord(medicalRecordB.id, { title: "Compromised" })).rejects.toBeInstanceOf(AuthorizationError);
    const record = await database.medicalRecord.findUniqueOrThrow({ where: { id: medicalRecordB.id } });
    expect(encryption.decrypt(record.titleEncrypted)).toBe("Private title");
  });

  it("prevents User A from deleting User B's life event", async () => {
    const service = new PersonalDataService(userA.id, new PrismaPersonalDataGateway(database, encryption));
    await expect(service.deleteLifeEvent(lifeEventB.id)).rejects.toBeInstanceOf(AuthorizationError);
    expect((await database.lifeEvent.findUniqueOrThrow({ where: { id: lifeEventB.id } })).deletedAt).toBeNull();
  });

  it("does not expose User B's consent history to User A", async () => {
    const service = new PersonalDataService(userA.id, new PrismaPersonalDataGateway(database, encryption));
    const records = await service.listConsentHistory() as Array<{ userId: string }>;
    expect(records).toHaveLength(1);
    expect(records.every(record => record.userId === userA.id)).toBe(true);
  });

  it("rejects a database link from User A's medical record to User B's document", async () => {
    await expect(database.medicalRecord.create({ data: { userId: userA.id, sourceDocumentId: documentB.id, recordType: "REPORT", eventDate: new Date(), titleEncrypted: encryption.encrypt("Invalid link"), structuredDataEncrypted: encryption.encryptJson({}) } })).rejects.toThrow();
  });

  it("rejects a database link from User A's life event to User B's medical record", async () => {
    await expect(database.lifeEvent.create({ data: { userId: userA.id, medicalRecordId: medicalRecordB.id, category: "HEALTH", titleEncrypted: encryption.encrypt("Invalid event"), occurredAt: new Date(), metadataEncrypted: encryption.encryptJson({}) } })).rejects.toThrow();
  });

  it("writes minimal DENIED audit events for rejected operations", async () => {
    const denied = await database.auditLog.findMany({ where: { userId: userA.id, result: "DENIED" } });
    expect(denied.length).toBeGreaterThanOrEqual(3);
    expect(denied.every(log => JSON.stringify(log.metadata) === "{}")).toBe(true);
  });

  it("persists one-time upload authorization and quarantines only after verified confirmation", async () => {
    const storageKey = `users/${userA.id}/documents/generated.pdf`;
    const storage: PrivateStorage = {
      createUploadAuthorization: async () => ({ storageKey, uploadUrl: "http://127.0.0.1:9000/private-signed-put", expiresAt: new Date(Date.now() + 600_000), requiredHeaders: { "content-type": "application/pdf" } }),
      confirmUpload: async input => ({ storageKey: input.storageKey, sizeBytes: input.expectedSizeBytes, checksum: input.expectedChecksum }),
      getPrivateObject: async () => { throw new Error("not used"); },
      deletePrivateObject: async () => undefined,
    };
    const service = new DocumentUploadService(database, storage, encryption);
    const authorization = await service.authorize(userA.id, { originalFileName: "private-name.pdf", mimeType: "application/pdf", sizeBytes: 120, checksum: "b".repeat(64), category: "HEALTH" });
    expect(authorization).not.toHaveProperty("storageKey");
    const stored = await database.sourceDocument.findUniqueOrThrow({ where: { id: authorization.documentId } });
    expect(stored.originalFileNameEncrypted).not.toContain("private-name.pdf");
    expect(stored.status).toBe("PENDING_UPLOAD");
    expect((await service.confirm(userA.id, authorization.uploadId)).status).toBe("QUARANTINED");
    expect((await database.sourceDocument.findUniqueOrThrow({ where: { id: authorization.documentId } })).status).toBe("QUARANTINED");
    await expect(service.confirm(userA.id, authorization.uploadId)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("persists Clerk replay protection and does not apply the same event twice", async () => {
    const event = { type: "user.created" as const, data: { id: "integration-webhook-user", first_name: "Webhook", email_addresses: [{ id: "email-1", email_address: "webhook@example.test" }], primary_email_address_id: "email-1" } };
    expect(await processClerkWebhook(database, "svix-integration-1", event)).toEqual({ duplicate: false });
    expect(await processClerkWebhook(database, "svix-integration-1", event)).toEqual({ duplicate: true });
    expect(await database.webhookEvent.count({ where: { provider: "clerk", externalEventId: "svix-integration-1", status: "PROCESSED" } })).toBe(1);
    expect(await database.user.count({ where: { clerkUserId: "integration-webhook-user" } })).toBe(1);
  });

  it("persists encrypted savings goals through correction/export/deletion while enforcing owner and workflow boundaries", async () => {
    const service = new FinanceService(database, encryption);
    const input = {
      kind: "SAVINGS_GOAL", title: "Synthetic private emergency fund", notes: "Synthetic private savings note",
      targetAmount: 12_345.67, currentAmount: 1_234.56, monthlyContribution: 250.25, targetDate: "2027-03-01",
    };
    const { recordId } = await service.create(userA.id, input);
    const stored = await database.lifeEvent.findUniqueOrThrow({ where: { id: recordId } });
    expect(stored.category).toBe("FINANCE");
    expect(stored.occurredAt).toEqual(new Date("2027-03-01T00:00:00Z"));
    expect(stored.titleEncrypted).not.toContain(input.title);
    expect(stored.descriptionEncrypted).not.toContain(input.notes);
    expect(stored.metadataEncrypted).not.toContain(String(input.targetAmount));
    expect(stored.metadataEncrypted).not.toContain("targetAmount");
    expect(encryption.decryptJson(stored.metadataEncrypted)).toEqual({
      origin: "USER_ENTERED", kind: "SAVINGS_GOAL", financeVersion: 1,
      finance: { ...input, currency: "NPR" },
    });
    expect((await service.list(userA.id)).records).toContainEqual({ ...input, currency: "NPR", id: recordId });
    expect(await service.list(userB.id)).toEqual({ records: [], invalidRecordCount: 0 });
    await expect(service.replace(userB.id, recordId, { ...input, currentAmount: 999 })).rejects.toBeInstanceOf(AuthorizationError);
    await expect(service.delete(userB.id, recordId)).rejects.toBeInstanceOf(AuthorizationError);

    const genericEvents = new LifeEventEntryService(database, encryption);
    await expect(genericEvents.replace(userA.id, recordId, { title: "Bypass finance validation", occurredAt: "2027-03-01" })).rejects.toBeInstanceOf(AuthorizationError);
    await expect(genericEvents.delete(userA.id, recordId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(await database.lifeEvent.findUniqueOrThrow({ where: { id: recordId } })).toEqual(stored);

    const replacement = { ...input, title: "Synthetic revised emergency fund", currentAmount: 2_345.67 };
    await service.replace(userA.id, recordId, replacement);
    // A fresh service reads the persisted revision, rather than an in-memory draft.
    expect((await new FinanceService(database, encryption).list(userA.id)).records)
      .toContainEqual({ ...replacement, currency: "NPR", id: recordId });

    // The JSON-export route includes active LifeEvents and decrypts this metadata.
    const exportEvents = await database.lifeEvent.findMany({ where: { userId: userA.id, deletedAt: null } });
    const exportedGoal = exportEvents.find((event) => event.id === recordId)!;
    expect(encryption.decrypt(exportedGoal.titleEncrypted)).toBe(replacement.title);
    expect(encryption.decryptJson(exportedGoal.metadataEncrypted)).toMatchObject({ finance: { ...replacement, currency: "NPR" } });

    await service.delete(userA.id, recordId);
    expect((await service.list(userA.id)).records.some((record) => record.id === recordId)).toBe(false);
    expect(await database.lifeEvent.findFirst({ where: { id: recordId, userId: userA.id, deletedAt: null } })).toBeNull();
    // Deletion is currently soft: active exports exclude it, and the stored row records that state.
    expect((await database.lifeEvent.findUniqueOrThrow({ where: { id: recordId } })).deletedAt).toBeInstanceOf(Date);
    const denials = await database.auditLog.findMany({ where: { resourceId: recordId, result: "DENIED" } });
    expect(denials).toHaveLength(4);
    expect(denials.every((audit) => JSON.stringify(audit.metadata) === "{}")).toBe(true);
  });

  it("recalculates monthly cash flow and additive budgets from persisted transaction changes", async () => {
    const service = new FinanceService(database, encryption);
    const income = { kind: "TRANSACTION", title: "Synthetic income", direction: "INCOME", category: "Salary", amount: 1_000.1, date: "2026-09-23" };
    const expense = { kind: "TRANSACTION", title: "Synthetic groceries", direction: "EXPENSE", category: "Food", amount: 125.35, date: "2026-09-23" };
    const budget = { kind: "BUDGET", title: "Synthetic food allowance", category: "FOOD", month: "2026-09", limit: 200 };
    const created = [
      await service.create(userA.id, income),
      await service.create(userA.id, expense),
      await service.create(userA.id, budget),
      await service.create(userA.id, { ...budget, title: "Synthetic additional allowance", limit: 50 }),
    ];
    const persisted = await service.list(userA.id);
    expect(persisted.invalidRecordCount).toBe(0);
    expect(persisted.records).toHaveLength(4);
    expect(summarizeFinanceMonth(persisted.records, "2026-09")).toMatchObject({
      income: 1_000.1, expenses: 125.35, net: 874.75, budgetLimit: 250, budgetRemaining: 124.65,
      categories: [{ category: "food", expenses: 125.35, budgetLimit: 250, budgetRemaining: 124.65, hasBudget: true }],
    });

    await service.replace(userA.id, created[1].recordId, { ...expense, amount: 175.45 });
    expect(summarizeFinanceMonth((await service.list(userA.id)).records, "2026-09"))
      .toMatchObject({ expenses: 175.45, net: 824.65, budgetRemaining: 74.55 });
    await service.delete(userA.id, created[3].recordId);
    expect(summarizeFinanceMonth((await service.list(userA.id)).records, "2026-09"))
      .toMatchObject({ budgetLimit: 200, budgetRemaining: 24.55 });
    expect((await service.list(userB.id)).records).toEqual([]);
  });
});
