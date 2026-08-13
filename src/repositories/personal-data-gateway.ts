import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getApplicationEncryption, type VersionedEncryption } from "@/lib/security/encryption";
import type { PersonalDataGateway } from "@/services/personal-data";

export class PrismaPersonalDataGateway implements PersonalDataGateway {
  constructor(private readonly database: PrismaClient, private readonly encryption: VersionedEncryption = getApplicationEncryption()) {}

  async findSourceDocument(where: { id: string; userId: string }) {
    const document = await this.database.sourceDocument.findFirst({ where: { ...where, deletedAt: null }, select: { id: true, originalFileNameEncrypted: true, mimeType: true, sizeBytes: true, category: true, status: true, verificationStatus: true, uploadedAt: true } });
    return document ? { ...document, originalFileName: this.encryption.decrypt(document.originalFileNameEncrypted), originalFileNameEncrypted: undefined } : null;
  }

  updateMedicalRecord(where: { id: string; userId: string }, data: Record<string, unknown>) {
    const encryptedData = {
      ...(typeof data.title === "string" ? { titleEncrypted: this.encryption.encrypt(data.title) } : {}),
      ...(data.summary === null ? { summaryEncrypted: null } : typeof data.summary === "string" ? { summaryEncrypted: this.encryption.encrypt(data.summary) } : {}),
      ...(data.providerName === null ? { providerNameEncrypted: null } : typeof data.providerName === "string" ? { providerNameEncrypted: this.encryption.encrypt(data.providerName) } : {}),
      ...(data.eventDate instanceof Date ? { eventDate: data.eventDate } : {}),
    };
    return this.database.medicalRecord.updateMany({ where: { ...where, deletedAt: null }, data: encryptedData });
  }

  deleteLifeEvent(where: { id: string; userId: string }) { return this.database.lifeEvent.updateMany({ where: { ...where, deletedAt: null }, data: { deletedAt: new Date() } }); }
  listConsentRecords(where: { userId: string }) { return this.database.consentRecord.findMany({ where, orderBy: { createdAt: "desc" } }); }
  async createAudit(input: { userId: string; actorUserId: string; action: string; resourceType: string; resourceId?: string; result: "SUCCESS" | "DENIED" }) { await this.database.auditLog.create({ data: { ...input, metadata: {} } }); }
}
