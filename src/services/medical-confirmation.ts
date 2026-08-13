import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { VersionedEncryption } from "@/lib/security/encryption";
import { AuthorizationError } from "@/lib/security/errors";
import { medicalRecordConfirmationSchema } from "@/validation/medical-records";

export class MedicalConfirmationService {
  constructor(private readonly database: PrismaClient, private readonly encryption: VersionedEncryption) {}

  async confirm(userId: string, rawInput: unknown) {
    const input = medicalRecordConfirmationSchema.parse(rawInput);
    const source = await this.database.sourceDocument.findFirst({
      where: { id: input.sourceDocumentId, userId, category: "HEALTH", deletedAt: null, status: { in: ["QUARANTINED", "AVAILABLE"] } },
      select: { id: true },
    });
    if (!source) throw new AuthorizationError();

    return this.database.$transaction(async (transaction) => {
      const now = new Date();
      const record = await transaction.medicalRecord.create({
        data: {
          userId,
          sourceDocumentId: source.id,
          recordType: input.recordType,
          eventDate: input.eventDate,
          providerNameEncrypted: input.providerName ? this.encryption.encrypt(input.providerName) : null,
          titleEncrypted: this.encryption.encrypt(input.title),
          summaryEncrypted: input.summary ? this.encryption.encrypt(input.summary) : null,
          structuredDataEncrypted: this.encryption.encryptJson({ medications: input.medications }),
          verificationStatus: "USER_CONFIRMED",
          verifiedByUserId: userId,
          verifiedAt: now,
        },
      });
      const event = await transaction.lifeEvent.create({
        data: {
          userId,
          sourceDocumentId: source.id,
          category: "HEALTH",
          titleEncrypted: this.encryption.encrypt(input.title),
          descriptionEncrypted: input.summary ? this.encryption.encrypt(input.summary) : null,
          occurredAt: input.eventDate,
          verificationStatus: "USER_CONFIRMED",
          metadataEncrypted: this.encryption.encryptJson({ medicalRecordId: record.id, recordType: input.recordType }),
        },
      });
      await transaction.sourceDocument.update({ where: { id_userId: { id: source.id, userId } }, data: { verificationStatus: "USER_CONFIRMED" } });
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "medical_record.confirm", resourceType: "MedicalRecord", resourceId: record.id, result: "SUCCESS", metadata: { lifeEventId: event.id, sourceDocumentId: source.id } } });
      return { recordId: record.id, lifeEventId: event.id };
    });
  }
}
