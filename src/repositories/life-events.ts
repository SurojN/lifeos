import "server-only";
import { getDatabase } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { getApplicationEncryption } from "@/lib/security/encryption";

export async function listLifeEventsForUser(userId: string) {
  const events = await getDatabase().lifeEvent.findMany({
    where: { userId, deletedAt: null },
    include: { sourceDocument: { select: { originalFileNameEncrypted: true } } },
    orderBy: { occurredAt: "desc" },
  });
  const encryption = getApplicationEncryption();
  await getDatabase().auditLog.create({ data: { userId, actorUserId: userId, action: "life_event.list", resourceType: "LifeEvent", result: "SUCCESS", metadata: {} } });
  return events.map(({ titleEncrypted, descriptionEncrypted, metadataEncrypted, sourceDocument, ...event }) => ({
    ...event,
    title: encryption.decrypt(titleEncrypted),
    description: descriptionEncrypted ? encryption.decrypt(descriptionEncrypted) : null,
    metadata: encryption.decryptJson(metadataEncrypted),
    sourceFileName: sourceDocument ? encryption.decrypt(sourceDocument.originalFileNameEncrypted) : null,
  }));
}

export function createLifeEventForUser(userId: string, input: { sourceDocumentId?: string; category: Prisma.LifeEventUncheckedCreateInput["category"]; title: string; description?: string; occurredAt: Date; verificationStatus?: Prisma.LifeEventUncheckedCreateInput["verificationStatus"]; metadata: unknown }) {
  const encryption = getApplicationEncryption();
  return getDatabase().$transaction(async transaction => {
    const event = await transaction.lifeEvent.create({ data: { userId, sourceDocumentId: input.sourceDocumentId, category: input.category, titleEncrypted: encryption.encrypt(input.title), descriptionEncrypted: input.description ? encryption.encrypt(input.description) : null, occurredAt: input.occurredAt, verificationStatus: input.verificationStatus, metadataEncrypted: encryption.encryptJson(input.metadata) } });
    await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "life_event.create", resourceType: "LifeEvent", resourceId: event.id, result: "SUCCESS", metadata: {} } });
    return event;
  });
}

export function deleteLifeEventForUser(userId: string, eventId: string) {
  return getDatabase().$transaction(async transaction => {
    const result = await transaction.lifeEvent.updateMany({ where: { id: eventId, userId, deletedAt: null }, data: { deletedAt: new Date() } });
    await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "life_event.delete", resourceType: "LifeEvent", resourceId: eventId, result: result.count === 1 ? "SUCCESS" : "DENIED", metadata: {} } });
    return result;
  });
}
