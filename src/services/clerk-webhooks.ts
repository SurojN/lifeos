import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";

export interface ClerkUserWebhookEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email_addresses?: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string | null;
  };
}

export async function processClerkWebhook(database: PrismaClient, externalEventId: string, event: ClerkUserWebhookEvent): Promise<{ duplicate: boolean }> {
  try {
    await database.webhookEvent.create({ data: { provider: "clerk", externalEventId, eventType: event.type, status: "RECEIVED" } });
  } catch {
    const existing = await database.webhookEvent.findUnique({ where: { provider_externalEventId: { provider: "clerk", externalEventId } }, select: { status: true } });
    if (existing?.status === "PROCESSED") return { duplicate: true };
    if (!existing) throw new Error("Webhook event could not be recorded.");
  }

  try {
    return await database.$transaction(async transaction => {
      // This conditional write locks the ledger row until commit. Concurrent
      // deliveries re-check the predicate after the first transaction finishes.
      // FAILED/RECEIVED events must be retried, never acknowledged as processed.
      const claimed = await transaction.webhookEvent.updateMany({
        where: { provider: "clerk", externalEventId, status: { in: ["RECEIVED", "FAILED"] } },
        data: { status: "RECEIVED", failureCode: null },
      });
      if (claimed.count !== 1) return { duplicate: true };
      let internalUserId: string | undefined;
      if (event.type === "user.deleted") {
        const existingUser = await transaction.user.findUnique({ where: { clerkUserId: event.data.id }, select: { id: true } });
        internalUserId = existingUser?.id;
        await transaction.user.updateMany({ where: { clerkUserId: event.data.id, deletedAt: null }, data: { status: "DELETED", deletedAt: new Date() } });
      } else {
        const primaryEmail = event.data.email_addresses?.find(email => email.id === event.data.primary_email_address_id)?.email_address ?? event.data.email_addresses?.[0]?.email_address ?? "unknown";
        const displayName = [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || "LifeOS user";
        const user = await transaction.user.upsert({ where: { clerkUserId: event.data.id }, update: { email: primaryEmail, displayName }, create: { clerkUserId: event.data.id, email: primaryEmail, displayName }, select: { id: true } });
        internalUserId = user.id;
      }
      await transaction.webhookEvent.update({ where: { provider_externalEventId: { provider: "clerk", externalEventId } }, data: { status: "PROCESSED", processedAt: new Date(), userId: internalUserId } });
      return { duplicate: false };
    });
  } catch {
    await database.webhookEvent.updateMany({ where: { provider: "clerk", externalEventId, status: "RECEIVED" }, data: { status: "FAILED", failureCode: "processing_failed" } }).catch(() => undefined);
    throw new Error("Webhook processing failed.");
  }
}
