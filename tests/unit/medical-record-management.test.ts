import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { VersionedEncryption } from "@/lib/security/encryption";
import { AuthorizationError } from "@/lib/security/errors";
import { MedicalRecordManagementService } from "@/services/medical-record-management";

const userId = "clh1234567890abcdefghijklm";
const recordId = "clh1234567890abcdefghijklmn";
const legacyEventId = "clh1234567890abcdefghijklo";
const encryption = new VersionedEncryption(`v1:${randomBytes(32).toString("base64")}`);

let findRecord: ReturnType<typeof vi.fn>;
let updateRecord: ReturnType<typeof vi.fn>;
let findLinkedEvent: ReturnType<typeof vi.fn>;
let findEvents: ReturnType<typeof vi.fn>;
let updateEvents: ReturnType<typeof vi.fn>;
let createEvent: ReturnType<typeof vi.fn>;
let createAudit: ReturnType<typeof vi.fn>;
let service: MedicalRecordManagementService;

beforeEach(() => {
  findRecord = vi.fn(async () => ({ id: recordId }));
  updateRecord = vi.fn(async () => ({ count: 1 }));
  findLinkedEvent = vi.fn(async () => null);
  findEvents = vi.fn(async () => [{ id: legacyEventId, metadataEncrypted: encryption.encryptJson({ medicalRecordId: recordId }) }]);
  updateEvents = vi.fn(async () => ({ count: 1 }));
  createEvent = vi.fn(async () => ({ id: legacyEventId }));
  createAudit = vi.fn(async () => ({}));
  const transaction = {
    medicalRecord: { updateMany: updateRecord },
    lifeEvent: { findFirst: findLinkedEvent, findMany: findEvents, updateMany: updateEvents, create: createEvent },
    auditLog: { create: createAudit },
  };
  const database = {
    medicalRecord: { findFirst: findRecord },
    auditLog: { create: createAudit },
    $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction),
  } as unknown as PrismaClient;
  service = new MedicalRecordManagementService(database, encryption);
});

describe("medical record correction and deletion", () => {
  it("updates the confirmed record and its legacy timeline event together", async () => {
    await service.replace(userId, recordId, {
      recordType: "PRESCRIPTION",
      eventDate: "2026-01-12",
      title: "Corrected prescription",
      providerName: "Clinic",
      summary: "Copied from the source.",
      medications: [{ name: "Medicine", instructions: "Once daily" }],
    });

    expect(updateRecord).toHaveBeenCalledWith(expect.objectContaining({ where: { id: recordId, userId, deletedAt: null } }));
    expect(updateEvents).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: legacyEventId, userId, deletedAt: null },
      data: expect.objectContaining({ medicalRecordId: recordId, verificationStatus: "USER_CONFIRMED" }),
    }));
    expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "medical_record.replace", result: "SUCCESS" }) }));
  });

  it("soft-deletes the record and linked timeline event without deleting its source", async () => {
    await expect(service.delete(userId, recordId)).resolves.toEqual({ recordId, status: "DELETED" });
    expect(updateRecord).toHaveBeenCalledWith(expect.objectContaining({ data: { deletedAt: expect.any(Date) } }));
    expect(updateEvents).toHaveBeenCalledWith(expect.objectContaining({ data: { deletedAt: expect.any(Date) } }));
  });

  it("repairs a record that has no timeline event", async () => {
    findEvents.mockResolvedValueOnce([]);
    updateEvents.mockResolvedValueOnce({ count: 0 });
    await service.replace(userId, recordId, {
      recordType: "LAB_REPORT",
      eventDate: "2026-01-12",
      title: "Lab report",
      medications: [],
    });
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId, medicalRecordId: recordId, category: "HEALTH" }) }));
  });

  it("fails closed and audits access to a record outside the user scope", async () => {
    findRecord.mockResolvedValueOnce(null);
    await expect(service.delete(userId, recordId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(updateRecord).not.toHaveBeenCalled();
    expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "medical_record.delete", result: "DENIED", metadata: {} }) }));
  });
});
