import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse } from "@/lib/security/errors";
import { FinanceService } from "@/services/finance";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireInternalUser();
    const service = new FinanceService(getDatabase(), getApplicationEncryption());
    return Response.json(await service.create(user.id, await request.json()), { status: 201 });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
