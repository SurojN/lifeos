import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse } from "@/lib/security/errors";
import { LifeEventEntryService } from "@/services/life-event-entry";

export const runtime = "nodejs";

type Context = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const user = await requireInternalUser();
    const { eventId } = await context.params;
    const service = new LifeEventEntryService(getDatabase(), getApplicationEncryption());
    return Response.json(await service.replace(user.id, eventId, await request.json()));
  } catch (error) {
    return safeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  try {
    const user = await requireInternalUser();
    const { eventId } = await context.params;
    const service = new LifeEventEntryService(getDatabase(), getApplicationEncryption());
    return Response.json(await service.delete(user.id, eventId));
  } catch (error) {
    return safeErrorResponse(error);
  }
}
