import { headers } from "next/headers";
import { Webhook } from "svix";
import { z } from "zod";
import { getDatabase } from "@/lib/db/client";
import { getServerEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";

const clerkEventSchema = z.object({
  type: z.enum(["user.created", "user.updated", "user.deleted"]),
  data: z.object({
    id: z.string().min(1),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email_addresses: z.array(z.object({ id: z.string(), email_address: z.email() })).optional(),
    primary_email_address_id: z.string().nullable().optional(),
  }),
});

export async function POST(request: Request): Promise<Response> {
  const headerStore = await headers();
  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return Response.json({ error: "Invalid webhook." }, { status: 400 });

  try {
    const body = await request.text();
    const verified = new Webhook(getServerEnvironment().CLERK_WEBHOOK_SECRET).verify(body, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature });
    const event = clerkEventSchema.parse(verified);
    const database = getDatabase();
    if (event.type === "user.deleted") {
      await database.user.updateMany({ where: { clerkUserId: event.data.id, deletedAt: null }, data: { status: "DELETED", deletedAt: new Date() } });
    } else {
      const primaryEmail = event.data.email_addresses?.find(email => email.id === event.data.primary_email_address_id)?.email_address ?? event.data.email_addresses?.[0]?.email_address ?? "unknown";
      const displayName = [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || "LifeOS user";
      await database.user.upsert({ where: { clerkUserId: event.data.id }, update: { email: primaryEmail, displayName }, create: { clerkUserId: event.data.id, email: primaryEmail, displayName } });
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
