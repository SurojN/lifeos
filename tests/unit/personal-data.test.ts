import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditFailureError, AuthorizationError } from "@/lib/security/errors";
import { PersonalDataService, type PersonalDataGateway } from "@/services/personal-data";

const userA = "clh1234567890abcdefghijklm";
const resourceId = "clh1234567890abcdefghijklmn";
let gateway: PersonalDataGateway;
let audit: ReturnType<typeof vi.fn>;

beforeEach(() => {
  audit = vi.fn(async () => undefined);
  gateway = {
    findSourceDocument: vi.fn(async () => null),
    updateMedicalRecord: vi.fn(async () => ({ count: 0 })),
    deleteLifeEvent: vi.fn(async () => ({ count: 0 })),
    listConsentRecords: vi.fn(async () => []),
    createAudit: audit,
  };
});

describe("ownership-scoped personal data service", () => {
  it("does not let User A read User B's source document", async () => {
    await expect(new PersonalDataService(userA, gateway).findDocument(resourceId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(gateway.findSourceDocument).toHaveBeenCalledWith({ id: resourceId, userId: userA });
  });

  it("does not let User A update User B's medical record", async () => {
    await expect(new PersonalDataService(userA, gateway).updateMedicalRecord(resourceId, { title: "Updated" })).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("does not let User A delete User B's life event", async () => {
    await expect(new PersonalDataService(userA, gateway).deleteLifeEvent(resourceId)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("scopes consent history to the authenticated user", async () => {
    await new PersonalDataService(userA, gateway).listConsentHistory();
    expect(gateway.listConsentRecords).toHaveBeenCalledWith({ userId: userA });
    expect(audit).toHaveBeenCalledWith({ userId: userA, actorUserId: userA, action: "consent_history.read", resourceType: "ConsentRecord", resourceId: undefined, result: "SUCCESS" });
  });

  it("rejects a client-supplied user ID instead of changing ownership", async () => {
    await expect(new PersonalDataService(userA, gateway).updateMedicalRecord(resourceId, { title: "Updated", userId: "user-b" })).rejects.toThrow();
    expect(gateway.updateMedicalRecord).not.toHaveBeenCalled();
  });

  it("creates a minimal audit entry after a successful sensitive operation", async () => {
    gateway.deleteLifeEvent = vi.fn(async () => ({ count: 1 }));
    await new PersonalDataService(userA, gateway).deleteLifeEvent(resourceId);
    expect(audit).toHaveBeenCalledWith({ userId: userA, actorUserId: userA, action: "life_event.delete", resourceType: "LifeEvent", resourceId, result: "SUCCESS" });
  });

  it("records a minimal denied event without sensitive content", async () => {
    await expect(new PersonalDataService(userA, gateway).findDocument(resourceId)).rejects.toMatchObject({ message: "Resource not found." });
    expect(audit).toHaveBeenCalledWith({ userId: userA, actorUserId: userA, action: "source_document.read", resourceType: "SourceDocument", resourceId, result: "DENIED" });
  });

  it("fails closed if the required audit cannot be written", async () => {
    gateway.deleteLifeEvent = vi.fn(async () => ({ count: 1 }));
    gateway.createAudit = vi.fn(async () => { throw new Error("audit unavailable"); });
    await expect(new PersonalDataService(userA, gateway).deleteLifeEvent(resourceId)).rejects.toBeInstanceOf(AuditFailureError);
  });
});
