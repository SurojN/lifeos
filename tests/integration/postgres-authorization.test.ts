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
  await database.medicalRecord.deleteMany();
  await database.lifeEvent.deleteMany();
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
});
