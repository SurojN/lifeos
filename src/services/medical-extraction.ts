import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { createMedicalExtractionProvider } from "@/lib/ai/factory";
import { medicalExtractionSchema } from "@/lib/ai/types";
import { AuthorizationError } from "@/lib/security/errors";
import type { VersionedEncryption } from "@/lib/security/encryption";
import type { PrivateStorage } from "@/lib/storage/types";
import { resourceIdSchema } from "@/validation/common";
import { z } from "zod";
import { readDocumentBytes } from "@/lib/storage/document-content";

const extractionRequestSchema = z.object({ sourceDocumentId: z.string().trim().min(1).max(64), consent: z.literal(true) }).strict();

export class MedicalExtractionService {
  constructor(private readonly database: PrismaClient, private readonly storage: PrivateStorage, private readonly encryption: VersionedEncryption) {}

  async extract(userId: string, rawInput: unknown) {
    const input = extractionRequestSchema.parse(rawInput);
    const sourceDocumentId = resourceIdSchema.parse(input.sourceDocumentId);
    const source = await this.database.sourceDocument.findFirst({
      where: { id: sourceDocumentId, userId, category: "HEALTH", deletedAt: null, status: { in: ["QUARANTINED", "AVAILABLE"] } },
      select: { id: true, storageKey: true, mimeType: true, originalFileNameEncrypted: true },
    });
    if (!source) throw new AuthorizationError();

    const provider = createMedicalExtractionProvider();
    const job = await this.database.$transaction(async transaction => {
      const consent = await transaction.consentRecord.create({ data: { userId, consentType: "AI_MEDICAL_EXTRACTION", policyVersion: "2026-09-10", granted: true, grantedAt: new Date() } });
      const created = await transaction.extractionJob.create({ data: { userId, sourceDocumentId: source.id, provider: provider.name, model: provider.model, consentRecordId: consent.id, status: "PROCESSING", startedAt: new Date() } });
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "medical_extraction.start", resourceType: "ExtractionJob", resourceId: created.id, result: "SUCCESS", metadata: { sourceDocumentId: source.id, provider: provider.name } } });
      return created;
    });

    try {
      const object = await this.storage.getPrivateObject({ userId, storageKey: source.storageKey });
      const extraction = medicalExtractionSchema.parse(await provider.extractMedicalDocument({ bytes: await readDocumentBytes(object.body), mimeType: source.mimeType, fileName: this.encryption.decrypt(source.originalFileNameEncrypted) }));
      await this.database.$transaction(async transaction => {
        await transaction.extractionJob.update({ where: { id: job.id }, data: { status: "NEEDS_REVIEW", resultEncrypted: this.encryption.encryptJson(extraction), completedAt: new Date() } });
        await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "medical_extraction.complete", resourceType: "ExtractionJob", resourceId: job.id, result: "SUCCESS", metadata: { sourceDocumentId: source.id } } });
      });
      return { jobId: job.id, extraction };
    } catch (error) {
      await this.database.$transaction(async transaction => {
        await transaction.extractionJob.update({ where: { id: job.id }, data: { status: "FAILED", failureReason: "extraction_failed", completedAt: new Date() } });
        await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "medical_extraction.complete", resourceType: "ExtractionJob", resourceId: job.id, result: "FAILED", metadata: { sourceDocumentId: source.id } } });
      });
      throw error;
    }
  }
}
