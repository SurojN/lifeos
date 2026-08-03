import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";

export interface AuditInput {
  userId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: "SUCCESS" | "DENIED" | "FAILED";
  metadata?: Record<string, string | number | boolean>;
  ipHash?: string;
  userAgent?: string;
}

export async function createAuditLog(database: PrismaClient, input: AuditInput): Promise<void> {
  await database.auditLog.create({ data: { ...input, metadata: input.metadata ?? {} } });
}
