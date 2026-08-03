import "server-only";
import { getDatabase } from "@/lib/db/client";
import type { Prisma } from "@/generated/prisma/client";

export function createLifeEventForUser(userId: string, input: Omit<Prisma.LifeEventUncheckedCreateInput, "userId">) {
  return getDatabase().lifeEvent.create({ data: { ...input, userId } });
}

export function deleteLifeEventForUser(userId: string, eventId: string) {
  return getDatabase().lifeEvent.updateMany({ where: { id: eventId, userId, deletedAt: null }, data: { deletedAt: new Date() } });
}
