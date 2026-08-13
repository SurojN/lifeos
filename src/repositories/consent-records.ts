import "server-only";
import { getDatabase } from "@/lib/db/client";

export async function listConsentHistoryForUser(userId: string) {
  const database = getDatabase();
  const records = await database.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  await database.auditLog.create({ data: { userId, actorUserId: userId, action: "consent_history.read", resourceType: "ConsentRecord", result: "SUCCESS", metadata: {} } });
  return records;
}

export function appendConsentRecordForUser(userId: string, input: { consentType: string; policyVersion: string; granted: boolean; occurredAt: Date }) {
  return getDatabase().$transaction(async transaction => {
    const record = await transaction.consentRecord.create({ data: { userId, consentType: input.consentType, policyVersion: input.policyVersion, granted: input.granted, grantedAt: input.granted ? input.occurredAt : null, revokedAt: input.granted ? null : input.occurredAt } });
    await transaction.auditLog.create({ data: { userId, actorUserId: userId, action: "consent_record.append", resourceType: "ConsentRecord", resourceId: record.id, result: "SUCCESS", metadata: {} } });
    return record;
  });
}
