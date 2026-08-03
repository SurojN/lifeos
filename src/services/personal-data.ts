import { AuthorizationError } from "@/lib/security/errors";
import { resourceIdSchema } from "@/validation/common";
import { medicalRecordUpdateSchema } from "@/validation/medical-records";

export interface PersonalDataGateway {
  findSourceDocument(where: { id: string; userId: string }): Promise<unknown | null>;
  updateMedicalRecord(where: { id: string; userId: string }, data: Record<string, unknown>): Promise<{ count: number }>;
  deleteLifeEvent(where: { id: string; userId: string }): Promise<{ count: number }>;
  listConsentRecords(where: { userId: string }): Promise<unknown[]>;
  createAudit(input: { userId: string; actorUserId: string; action: string; resourceType: string; resourceId?: string; result: "SUCCESS" }): Promise<void>;
}

export class PersonalDataService {
  constructor(private readonly userId: string, private readonly gateway: PersonalDataGateway) {}

  async findDocument(documentId: string) {
    const id = resourceIdSchema.parse(documentId);
    const document = await this.gateway.findSourceDocument({ id, userId: this.userId });
    if (!document) throw new AuthorizationError();
    await this.audit("source_document.read", "SourceDocument", id);
    return document;
  }

  async updateMedicalRecord(recordId: string, input: Record<string, unknown>) {
    const id = resourceIdSchema.parse(recordId);
    const result = await this.gateway.updateMedicalRecord({ id, userId: this.userId }, medicalRecordUpdateSchema.parse(input));
    if (result.count !== 1) throw new AuthorizationError();
    await this.audit("medical_record.update", "MedicalRecord", id);
  }

  async deleteLifeEvent(eventId: string) {
    const id = resourceIdSchema.parse(eventId);
    const result = await this.gateway.deleteLifeEvent({ id, userId: this.userId });
    if (result.count !== 1) throw new AuthorizationError();
    await this.audit("life_event.delete", "LifeEvent", id);
  }

  listConsentHistory() { return this.gateway.listConsentRecords({ userId: this.userId }); }

  private audit(action: string, resourceType: string, resourceId: string) {
    return this.gateway.createAudit({ userId: this.userId, actorUserId: this.userId, action, resourceType, resourceId, result: "SUCCESS" });
  }
}
