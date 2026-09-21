import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { VersionedEncryption } from "@/lib/security/encryption";
import { AuthorizationError } from "@/lib/security/errors";
import { resourceIdSchema } from "@/validation/common";
import { medicalRecordReplacementSchema } from "@/validation/medical-records";

export class MedicalRecordManagementService {
  constructor(
    private readonly database: PrismaClient,
    private readonly encryption: VersionedEncryption,
  ) {}

  async replace(userId: string, rawRecordId: string, rawInput: unknown) {
    const recordId = resourceIdSchema.parse(rawRecordId);
    const input = medicalRecordReplacementSchema.parse(rawInput);
    const authorized = await this.database.medicalRecord.findFirst({
      where: { id: recordId, userId, deletedAt: null },
      select: { id: true, sourceDocumentId: true },
    });
    if (!authorized) return this.deny(userId, recordId, "medical_record.replace");

    return this.database.$transaction(async (transaction) => {
      const linkedEvent = await transaction.lifeEvent.findFirst({
        where: { userId, medicalRecordId: authorized.id, deletedAt: null },
        select: { id: true },
      });
      const legacyEventId = linkedEvent ? null : await this.findLegacyEventId(transaction, userId, authorized.id);

      const updated = await transaction.medicalRecord.updateMany({
        where: { id: authorized.id, userId, deletedAt: null },
        data: {
          recordType: input.recordType,
          eventDate: input.eventDate,
          providerNameEncrypted: input.providerName ? this.encryption.encrypt(input.providerName) : null,
          titleEncrypted: this.encryption.encrypt(input.title),
          summaryEncrypted: input.summary ? this.encryption.encrypt(input.summary) : null,
          structuredDataEncrypted: this.encryption.encryptJson({ medications: input.medications }),
          verificationStatus: "USER_CONFIRMED",
          verifiedByUserId: userId,
          verifiedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new AuthorizationError();
      const eventData = {
        medicalRecordId: authorized.id,
        titleEncrypted: this.encryption.encrypt(input.title),
        descriptionEncrypted: input.summary ? this.encryption.encrypt(input.summary) : null,
        occurredAt: input.eventDate,
        verificationStatus: "USER_CONFIRMED" as const,
        metadataEncrypted: this.encryption.encryptJson({ medicalRecordId: authorized.id, recordType: input.recordType }),
      };
      const timelineEvents = await transaction.lifeEvent.updateMany({
        where: { id: linkedEvent?.id ?? legacyEventId ?? "", userId, deletedAt: null },
        data: eventData,
      });
      if (timelineEvents.count === 0) await transaction.lifeEvent.create({
        data: {
          ...eventData,
          userId,
          sourceDocumentId: authorized.sourceDocumentId,
          category: "HEALTH",
        },
      });
      await transaction.auditLog.create({
        data: {
          userId,
          actorUserId: userId,
          action: "medical_record.replace",
          resourceType: "MedicalRecord",
          resourceId: authorized.id,
          result: "SUCCESS",
          metadata: {},
        },
      });
      return { recordId: authorized.id };
    });
  }

  async delete(userId: string, rawRecordId: string) {
    const recordId = resourceIdSchema.parse(rawRecordId);
    const authorized = await this.database.medicalRecord.findFirst({
      where: { id: recordId, userId, deletedAt: null },
      select: { id: true, sourceDocumentId: true },
    });
    if (!authorized) return this.deny(userId, recordId, "medical_record.delete");

    return this.database.$transaction(async (transaction) => {
      const linkedEvent = await transaction.lifeEvent.findFirst({
        where: { userId, medicalRecordId: authorized.id, deletedAt: null },
        select: { id: true },
      });
      const legacyEventId = linkedEvent ? null : await this.findLegacyEventId(transaction, userId, authorized.id);

      const deletedAt = new Date();
      const deleted = await transaction.medicalRecord.updateMany({
        where: { id: authorized.id, userId, deletedAt: null },
        data: { deletedAt },
      });
      if (deleted.count !== 1) throw new AuthorizationError();
      const timelineEvents = await transaction.lifeEvent.updateMany({
        where: { id: linkedEvent?.id ?? legacyEventId ?? "", userId, deletedAt: null },
        data: { deletedAt },
      });
      await transaction.auditLog.create({
        data: {
          userId,
          actorUserId: userId,
          action: "medical_record.delete",
          resourceType: "MedicalRecord",
          resourceId: authorized.id,
          result: "SUCCESS",
          metadata: { linkedLifeEventsDeleted: timelineEvents.count },
        },
      });
      return { recordId: authorized.id, status: "DELETED" as const };
    });
  }

  private async deny(userId: string, recordId: string, action: string): Promise<never> {
    await this.database.auditLog.create({
      data: {
        userId,
        actorUserId: userId,
        action,
        resourceType: "MedicalRecord",
        resourceId: recordId,
        result: "DENIED",
        metadata: {},
      },
    });
    throw new AuthorizationError();
  }

  private async findLegacyEventId(
    transaction: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
    userId: string,
    recordId: string,
  ): Promise<string | null> {
    const legacyEvents = await transaction.lifeEvent.findMany({
      where: { userId, medicalRecordId: null, deletedAt: null },
      select: { id: true, metadataEncrypted: true },
    });
    return legacyEvents.find((event) => isMedicalRecordMetadata(this.encryption.decryptJson(event.metadataEncrypted), recordId))?.id ?? null;
  }
}

function isMedicalRecordMetadata(value: unknown, recordId: string): boolean {
  return typeof value === "object" && value !== null && "medicalRecordId" in value && value.medicalRecordId === recordId;
}
