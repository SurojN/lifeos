import { requireInternalUser } from "@/lib/auth/adapter";
import { getDatabase } from "@/lib/db/client";
import { getApplicationEncryption } from "@/lib/security/encryption";
import { safeErrorResponse, AuthorizationError } from "@/lib/security/errors";
import { createPrivateStorage } from "@/lib/storage";
import { resourceIdSchema } from "@/validation/common";
import { attachmentDisposition } from "@/lib/storage/download-filename";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  try {
    const user = await requireInternalUser();
    const { documentId: rawId } = await context.params;
    const documentId = resourceIdSchema.parse(rawId);
    const document = await getDatabase().sourceDocument.findFirst({ where: { id: documentId, userId: user.id, deletedAt: null, status: { in: ["QUARANTINED", "AVAILABLE"] } } });
    if (!document) throw new AuthorizationError();
    const object = await createPrivateStorage().getPrivateObject({ userId: user.id, storageKey: document.storageKey });
    await getDatabase().auditLog.create({ data: { userId: user.id, actorUserId: user.id, action: "source_document.download", resourceType: "SourceDocument", resourceId: document.id, result: "SUCCESS", metadata: {} } });
    const filename = getApplicationEncryption().decrypt(document.originalFileNameEncrypted);
    return new Response(object.body as BodyInit, { headers: { "content-type": document.mimeType, "content-disposition": attachmentDisposition(filename), "x-content-type-options": "nosniff", "cache-control": "private, no-store" } });
  } catch (error) { return safeErrorResponse(error); }
}
