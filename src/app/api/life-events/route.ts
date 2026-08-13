import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse } from "@/lib/security/errors";
import { LifeEventEntryService } from "@/services/life-event-entry";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireInternalUser();
    return Response.json(await new LifeEventEntryService(getDatabase(), getApplicationEncryption()).create(user.id, await request.json()), { status: 201 });
  } catch (error) { return safeErrorResponse(error); }
}
