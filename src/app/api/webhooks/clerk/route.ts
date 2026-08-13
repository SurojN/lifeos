import { headers } from "next/headers";
import { Webhook } from "svix";
import { z } from "zod";
import { getDatabase } from "@/lib/db/client";
import { getWebhookEnvironment } from "@/lib/env/server";
import { processClerkWebhook } from "@/services/clerk-webhooks";

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

  let event: z.infer<typeof clerkEventSchema>;
  try {
    const body = await request.text();
    event = clerkEventSchema.parse(new Webhook(getWebhookEnvironment().CLERK_WEBHOOK_SECRET).verify(body, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature }));
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }

  try {
    const result = await processClerkWebhook(getDatabase(), svixId, event);
    return Response.json({ received: true, ...result });
  } catch {
    return Response.json({ error: "Webhook processing failed." }, { status: 503 });
  }
}
