import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { VersionedEncryption } from "@/lib/security/encryption";
import { userLifeEventSchema } from "@/validation/life-events";

export class LifeEventEntryService {
  constructor(private readonly database: PrismaClient, private readonly encryption: VersionedEncryption) {}

  async create(userId: string, rawInput: unknown) {
    const input = userLifeEventSchema.parse(rawInput);
    return this.database.$transaction(async (transaction) => {
      const event = await transaction.lifeEvent.create({ data: {
        userId,
        category: input.category,
        titleEncrypted: this.encryption.encrypt(input.title),
        descriptionEncrypted: input.description ? this.encryption.encrypt(input.description) : null,
        occurredAt: input.occurredAt,
        verificationStatus: "USER_CONFIRMED",
        metadataEncrypted: this.encryption.encryptJson({ ...input.metadata, kind: input.kind, origin: "USER_ENTERED" }),
      } });
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "life_event.create", resourceType: "LifeEvent", resourceId: event.id, result: "SUCCESS", metadata: { category: input.category, kind: input.kind } } });
      return { eventId: event.id };
    });
  }
}
