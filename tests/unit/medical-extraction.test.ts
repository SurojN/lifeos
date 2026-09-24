import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { PrivateStorage } from "@/lib/storage/types";
import { VersionedEncryption } from "@/lib/security/encryption";
import { MedicalExtractionService } from "@/services/medical-extraction";

const provider = vi.hoisted(() => ({ name: "synthetic", model: "test", extractMedicalDocument: vi.fn() }));
vi.mock("@/lib/ai/factory", () => ({ createMedicalExtractionProvider: () => provider }));
const encryption = new VersionedEncryption(`v1:${randomBytes(32).toString("base64")}`);
const documentId = "clh1234567890abcdefghijklm";
const source = { id: documentId, storageKey: "synthetic/key", mimeType: "image/png", originalFileNameEncrypted: encryption.encrypt("synthetic.png") };
const findSource = vi.fn();
const updateJob = vi.fn();
const createConsent = vi.fn();
const createJob = vi.fn();
const getObject = vi.fn();
const audit = vi.fn();
const tx = { consentRecord: { create: createConsent }, extractionJob: { create: createJob, update: updateJob }, auditLog: { create: audit } };
const database = { sourceDocument: { findFirst: findSource }, $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as PrismaClient;
const service = new MedicalExtractionService(database, { getPrivateObject: getObject } as unknown as PrivateStorage, encryption);
const extraction = { recordType: "OTHER", eventDate: null, providerName: null, title: "Synthetic report", summary: null, medications: [], confidence: 0.5, sourceNotes: [] };

beforeEach(() => {
  vi.resetAllMocks();
  findSource.mockResolvedValue(source);
  createConsent.mockResolvedValue({ id: "consent" });
  createJob.mockResolvedValue({ id: "job" });
  getObject.mockResolvedValue({ body: Readable.from([Buffer.from("synthetic image")]) });
  provider.extractMedicalDocument.mockResolvedValue(extraction);
});

describe("consented medical extraction", () => {
  it("requires explicit consent before any access or provider call", async () => {
    await expect(service.extract("owner", { sourceDocumentId: documentId, consent: false })).rejects.toThrow();
    expect(findSource).not.toHaveBeenCalled();
    expect(provider.extractMedicalDocument).not.toHaveBeenCalled();
  });

  it("requires an owned available health source", async () => {
    findSource.mockResolvedValue(null);
    await expect(service.extract("owner", { sourceDocumentId: documentId, consent: true })).rejects.toThrow();
    expect(findSource).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", category: "HEALTH", deletedAt: null }) }));
    expect(getObject).not.toHaveBeenCalled();
  });

  it("reads a real stream and persists encrypted unconfirmed suggestions", async () => {
    await expect(service.extract("owner", { sourceDocumentId: documentId, consent: true })).resolves.toMatchObject({ jobId: "job", extraction });
    expect(provider.extractMedicalDocument).toHaveBeenCalledWith(expect.objectContaining({ bytes: Buffer.from("synthetic image") }));
    const data = updateJob.mock.calls[0][0].data;
    expect(data.status).toBe("NEEDS_REVIEW");
    expect(encryption.decryptJson(data.resultEncrypted)).toEqual(extraction);
    expect(data.resultEncrypted).not.toContain("Synthetic report");
  });

  it("does not persist provider errors containing private document text", async () => {
    provider.extractMedicalDocument.mockRejectedValue(new Error("sensitive provider response"));
    await expect(service.extract("owner", { sourceDocumentId: documentId, consent: true })).rejects.toThrow();
    expect(updateJob).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", failureReason: "extraction_failed" }) }));
    expect(JSON.stringify(updateJob.mock.calls)).not.toContain("sensitive");
    expect(JSON.stringify(audit.mock.calls)).not.toContain("sensitive");
  });
});
