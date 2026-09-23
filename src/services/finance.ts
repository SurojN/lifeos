import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getDatabase } from "@/lib/db/client";
import type { FinanceRecord } from "@/lib/finance";
import { getApplicationEncryption, type VersionedEncryption } from "@/lib/security/encryption";
import { AuditFailureError, AuthorizationError } from "@/lib/security/errors";
import { resourceIdSchema } from "@/validation/common";
import { financeInputSchema, type FinanceInput } from "@/validation/finance";

const metadataKinds = {
  TRANSACTION: "FINANCE_TRANSACTION",
  BUDGET: "FINANCE_BUDGET",
  SAVINGS_GOAL: "SAVINGS_GOAL",
} as const;

export type FinanceRecordList = { records: FinanceRecord[]; invalidRecordCount: number };

export function listFinanceRecordsForUser(userId: string): Promise<FinanceRecordList> {
  return new FinanceService(getDatabase(), getApplicationEncryption()).list(userId);
}

export class FinanceService {
  constructor(private readonly database: PrismaClient, private readonly encryption: VersionedEncryption) {}

  async list(userId: string): Promise<FinanceRecordList> {
    return this.database.$transaction(async (transaction) => {
      const events = await transaction.lifeEvent.findMany({
        where: { userId, category: "FINANCE", medicalRecordId: null, deletedAt: null },
        select: { id: true, metadataEncrypted: true },
        orderBy: { occurredAt: "desc" },
      });
      const records: FinanceRecord[] = [];
      let invalidRecordCount = 0;
      for (const event of events) {
        const metadata = this.encryption.decryptJson<unknown>(event.metadataEncrypted);
        const input = parseFinanceMetadata(metadata);
        if (input) records.push({ ...input, id: event.id });
        else if (isFinanceMetadata(metadata)) invalidRecordCount += 1;
      }
      await this.audit(transaction, userId, "finance_record.list", "SUCCESS");
      return { records, invalidRecordCount };
    });
  }

  async create(userId: string, rawInput: unknown) {
    const input = financeInputSchema.parse(rawInput);
    return this.database.$transaction(async (transaction) => {
      const record = await transaction.lifeEvent.create({ data: {
        userId,
        category: "FINANCE",
        verificationStatus: "USER_CONFIRMED",
        ...this.encryptedFields(input),
      } });
      await this.audit(transaction, userId, "finance_record.create", "SUCCESS", record.id);
      return { recordId: record.id };
    });
  }

  async replace(userId: string, rawRecordId: string, rawInput: unknown) {
    const recordId = resourceIdSchema.parse(rawRecordId);
    const input = financeInputSchema.parse(rawInput);
    const result = await this.database.$transaction(async (transaction) => {
      const record = await this.findOwnedRecord(transaction, userId, recordId);
      if (!record) return this.deny(transaction, userId, "finance_record.replace", recordId);
      const updated = await transaction.lifeEvent.updateMany({
        where: { id: recordId, userId, category: "FINANCE", medicalRecordId: null, deletedAt: null, metadataEncrypted: record.metadataEncrypted },
        // Existing source relationships belong to the historical event and remain intact.
        data: this.encryptedFields(input),
      });
      if (updated.count !== 1) return this.deny(transaction, userId, "finance_record.replace", recordId);
      await this.audit(transaction, userId, "finance_record.replace", "SUCCESS", recordId);
      return { recordId };
    });
    if (!result) throw new AuthorizationError();
    return result;
  }

  async delete(userId: string, rawRecordId: string) {
    const recordId = resourceIdSchema.parse(rawRecordId);
    const result = await this.database.$transaction(async (transaction) => {
      const record = await this.findOwnedRecord(transaction, userId, recordId);
      if (!record) return this.deny(transaction, userId, "finance_record.delete", recordId);
      const deleted = await transaction.lifeEvent.updateMany({
        where: { id: recordId, userId, category: "FINANCE", medicalRecordId: null, deletedAt: null, metadataEncrypted: record.metadataEncrypted },
        data: { deletedAt: new Date() },
      });
      if (deleted.count !== 1) return this.deny(transaction, userId, "finance_record.delete", recordId);
      await this.audit(transaction, userId, "finance_record.delete", "SUCCESS", recordId);
      return { recordId, status: "DELETED" as const };
    });
    if (!result) throw new AuthorizationError();
    return result;
  }

  private encryptedFields(input: FinanceInput) {
    const date = input.kind === "TRANSACTION" ? input.date : input.kind === "BUDGET" ? `${input.month}-01` : input.targetDate;
    return {
      titleEncrypted: this.encryption.encrypt(input.title),
      descriptionEncrypted: input.notes ? this.encryption.encrypt(input.notes) : null,
      occurredAt: new Date(`${date}T00:00:00.000Z`),
      metadataEncrypted: this.encryption.encryptJson({ origin: "USER_ENTERED", kind: metadataKinds[input.kind], financeVersion: 1, finance: input }),
    };
  }

  private async findOwnedRecord(transaction: Prisma.TransactionClient, userId: string, recordId: string) {
    const record = await transaction.lifeEvent.findFirst({
      where: { id: recordId, userId, category: "FINANCE", medicalRecordId: null, deletedAt: null },
      select: { id: true, metadataEncrypted: true },
    });
    if (!record) return null;
    return parseFinanceMetadata(this.encryption.decryptJson<unknown>(record.metadataEncrypted)) ? record : null;
  }

  private async deny(transaction: Prisma.TransactionClient, userId: string, action: string, recordId: string) {
    await this.audit(transaction, userId, action, "DENIED", recordId);
    return null;
  }

  private async audit(transaction: Prisma.TransactionClient, userId: string, action: string, result: "SUCCESS" | "DENIED", recordId?: string) {
    try {
      await transaction.auditLog.create({ data: { userId, actorUserId: userId, action, resourceType: "LifeEvent", resourceId: recordId, result, metadata: {} } });
    } catch {
      throw new AuditFailureError();
    }
  }
}

function parseFinanceMetadata(value: unknown): FinanceInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || !("origin" in value) || value.origin !== "USER_ENTERED"
    || !("financeVersion" in value) || value.financeVersion !== 1
    || !("kind" in value) || !("finance" in value) || "medicalRecordId" in value) return null;
  const parsed = financeInputSchema.safeParse(value.finance);
  if (!parsed.success || value.kind !== metadataKinds[parsed.data.kind]) return null;
  return parsed.data;
}

function isFinanceMetadata(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && ("financeVersion" in value || ("kind" in value && Object.values(metadataKinds).some((kind) => value.kind === kind)));
}
