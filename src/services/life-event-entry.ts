import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { VersionedEncryption } from "@/lib/security/encryption";
import { AuditFailureError, AuthorizationError } from "@/lib/security/errors";
import { resourceIdSchema } from "@/validation/common";
import { userLifeEventReplacementSchema, userLifeEventSchema } from "@/validation/life-events";

export class LifeEventEntryService {
  constructor(private readonly database: PrismaClient, private readonly encryption: VersionedEncryption) {}

  async create(userId: string, rawInput: unknown) {
    const input = userLifeEventSchema.parse(rawInput);
    const result = await this.database.$transaction(async (transaction) => {
      if (input.sourceDocumentId && !await this.findSource(transaction, userId, input.sourceDocumentId)) {
        return this.deny(transaction, userId, "life_event.create");
      }
      const event = await transaction.lifeEvent.create({ data: {
        userId,
        sourceDocumentId: input.sourceDocumentId,
        category: input.category,
        titleEncrypted: this.encryption.encrypt(input.title),
        descriptionEncrypted: input.description ? this.encryption.encrypt(input.description) : null,
        occurredAt: input.occurredAt,
        verificationStatus: "USER_CONFIRMED",
        metadataEncrypted: this.encryption.encryptJson({ ...input.metadata, kind: input.kind, origin: "USER_ENTERED" }),
      } });
      await this.audit(transaction, userId, "life_event.create", "SUCCESS", event.id);
      return { eventId: event.id };
    });
    if (!result) throw new AuthorizationError();
    return result;
  }

  async replace(userId: string, rawEventId: string, rawInput: unknown) {
    const eventId = resourceIdSchema.parse(rawEventId);
    const input = userLifeEventReplacementSchema.parse(rawInput);
    const result = await this.database.$transaction(async (transaction) => {
      const event = await this.findEditableEvent(transaction, userId, eventId);
      if (!event) return this.deny(transaction, userId, "life_event.replace", eventId);
      if (input.sourceDocumentId && !await this.findSource(transaction, userId, input.sourceDocumentId)) {
        return this.deny(transaction, userId, "life_event.replace", eventId);
      }
      const updated = await transaction.lifeEvent.updateMany({
        where: { id: eventId, userId, deletedAt: null, medicalRecordId: null, metadataEncrypted: event.metadataEncrypted },
        data: {
          titleEncrypted: this.encryption.encrypt(input.title),
          descriptionEncrypted: input.description ? this.encryption.encrypt(input.description) : null,
          occurredAt: input.occurredAt,
          ...(input.sourceDocumentId !== undefined ? { sourceDocumentId: input.sourceDocumentId } : {}),
        },
      });
      if (updated.count !== 1) return this.deny(transaction, userId, "life_event.replace", eventId);
      await this.audit(transaction, userId, "life_event.replace", "SUCCESS", eventId);
      return { eventId };
    });
    if (!result) throw new AuthorizationError();
    return result;
  }

  async delete(userId: string, rawEventId: string) {
    const eventId = resourceIdSchema.parse(rawEventId);
    const result = await this.database.$transaction(async (transaction) => {
      const event = await this.findEditableEvent(transaction, userId, eventId);
      if (!event) return this.deny(transaction, userId, "life_event.delete", eventId);
      const deleted = await transaction.lifeEvent.updateMany({
        where: { id: eventId, userId, deletedAt: null, medicalRecordId: null, metadataEncrypted: event.metadataEncrypted },
        data: { deletedAt: new Date() },
      });
      if (deleted.count !== 1) return this.deny(transaction, userId, "life_event.delete", eventId);
      await this.audit(transaction, userId, "life_event.delete", "SUCCESS", eventId);
      return { eventId, status: "DELETED" as const };
    });
    if (!result) throw new AuthorizationError();
    return result;
  }

  private findSource(transaction: Prisma.TransactionClient, userId: string, sourceDocumentId: string) {
    return transaction.sourceDocument.findFirst({
      where: { id: sourceDocumentId, userId, deletedAt: null, status: { in: ["QUARANTINED", "AVAILABLE"] } },
      select: { id: true },
    });
  }

  private async findEditableEvent(transaction: Prisma.TransactionClient, userId: string, eventId: string) {
    const event = await transaction.lifeEvent.findFirst({
      where: { id: eventId, userId, deletedAt: null, medicalRecordId: null },
      select: { id: true, metadataEncrypted: true },
    });
    if (!event) return null;
    const metadata = this.encryption.decryptJson<unknown>(event.metadataEncrypted);
    return isUserEnteredMetadata(metadata) ? event : null;
  }

  private async deny(transaction: Prisma.TransactionClient, userId: string, action: string, eventId?: string) {
    await this.audit(transaction, userId, action, "DENIED", eventId);
    // Return first so the denial audit commits; throwing inside rolls it back.
    return null;
  }

  private async audit(transaction: Prisma.TransactionClient, userId: string, action: string, result: "SUCCESS" | "DENIED", eventId?: string) {
    try {
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action, resourceType: "LifeEvent", resourceId: eventId, result, metadata: {} } });
    } catch {
      throw new AuditFailureError();
    }
  }
}

function isUserEnteredMetadata(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && "origin" in value && value.origin === "USER_ENTERED" && !("medicalRecordId" in value) && !("financeVersion" in value);
}
