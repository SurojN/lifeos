import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse } from "@/lib/security/errors";
import { MedicalRecordManagementService } from "@/services/medical-record-management";

export const runtime = "nodejs";

type Context = { params: Promise<{ recordId: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const user = await requireInternalUser();
    const { recordId } = await context.params;
    const service = new MedicalRecordManagementService(getDatabase(), getApplicationEncryption());
    return Response.json(await service.replace(user.id, recordId, await request.json()));
  } catch (error) {
    return safeErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context): Promise<Response> {
  try {
    const user = await requireInternalUser();
    const { recordId } = await context.params;
    const service = new MedicalRecordManagementService(getDatabase(), getApplicationEncryption());
    return Response.json(await service.delete(user.id, recordId));
  } catch (error) {
    return safeErrorResponse(error);
  }
}
