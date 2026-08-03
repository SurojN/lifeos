import "server-only";
import { getDatabase } from "@/lib/db/client";

export function listConsentHistoryForUser(userId: string) {
  return getDatabase().consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export function appendConsentRecordForUser(userId: string, input: { consentType: string; policyVersion: string; granted: boolean; occurredAt: Date }) {
  return getDatabase().consentRecord.create({ data: { userId, consentType: input.consentType, policyVersion: input.policyVersion, granted: input.granted, grantedAt: input.granted ? input.occurredAt : null, revokedAt: input.granted ? null : input.occurredAt } });
}
