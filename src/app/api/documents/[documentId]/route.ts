import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse } from "@/lib/security/errors";
import { createPrivateStorage } from "@/lib/storage";
import { DocumentUploadService } from "@/services/document-uploads";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ documentId: string }> }): Promise<Response> {
  try {
    const user = await requireInternalUser();
    const { documentId } = await context.params;
    const service = new DocumentUploadService(getDatabase(), createPrivateStorage(), getApplicationEncryption());
    return Response.json(await service.delete(user.id, documentId));
  } catch (error) {
    return safeErrorResponse(error);
  }
}
