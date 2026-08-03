import type { LifeEvent, RetirementPlan, StoredSourceDocument } from "../domain/models.ts";

export interface LifeOSRepository {
  initialize(defaultPlan: RetirementPlan): Promise<void>;
  listEvents(): Promise<LifeEvent[]>;
  putEvent(event: LifeEvent): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  getRetirementPlan(): Promise<RetirementPlan | undefined>;
  putRetirementPlan(plan: RetirementPlan): Promise<void>;
  listDocuments(): Promise<StoredSourceDocument[]>;
  putDocument(document: StoredSourceDocument): Promise<void>;
  confirmMedicalDocument(document: StoredSourceDocument, event: LifeEvent): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}
