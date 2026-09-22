import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { VersionedEncryption } from "@/lib/security/encryption";
import { AuditFailureError, AuthorizationError } from "@/lib/security/errors";
import { LifeEventEntryService } from "@/services/life-event-entry";

const userId = "clh1234567890abcdefghijklm";
const eventId = "clh1234567890abcdefghijklmn";
const sourceId = "clh1234567890abcdefghijklo";
const encryption = new VersionedEncryption(`v1:${randomBytes(32).toString("base64")}`);
const replacement = { title: "Updated plan", description: "Private revised notes", occurredAt: "2026-10-02T06:30:00.000Z" };
const creation = { category: "TRAVEL", kind: "TRIP", title: "Private trip", description: "Private itinerary", occurredAt: "2026-10-01", metadata: { budget: 2500 } };

type Event = {
  id: string;
  userId: string;
  category: string;
  titleEncrypted: string;
  descriptionEncrypted: string | null;
  occurredAt: Date;
  metadataEncrypted: string;
  sourceDocumentId: string | null;
  medicalRecordId: string | null;
  verificationStatus: string;
  deletedAt: Date | null;
};
type Source = { id: string; userId: string; status: string; deletedAt: Date | null; verificationStatus: string };
type Audit = { userId: string; actorUserId: string; action: string; resourceType: string; resourceId?: string; result: string; metadata: object };
type State = { events: Event[]; sources: Source[]; audits: Audit[] };

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: eventId, userId, category: "TRAVEL", titleEncrypted: encryption.encrypt("Original trip"),
    descriptionEncrypted: encryption.encrypt("Original notes"), occurredAt: new Date("2026-10-01"),
    metadataEncrypted: encryption.encryptJson({ origin: "USER_ENTERED", kind: "TRIP", budget: 2500 }),
    sourceDocumentId: sourceId, medicalRecordId: null, verificationStatus: "USER_CONFIRMED", deletedAt: null,
    ...overrides,
  };
}

function fixture(events: Event[] = [event()], sources: Source[] = [{ id: sourceId, userId, status: "AVAILABLE", deletedAt: null, verificationStatus: "UNVERIFIED" }]) {
  let state: State = { events, sources, audits: [] };
  let draft: State | null = null;
  const active = () => {
    if (!draft) throw new Error("Database access must occur inside the transaction.");
    return draft;
  };
  const matches = (value: Event, where: Partial<Event>) => Object.entries(where).every(([key, expected]) => value[key as keyof Event] === expected);
  const findEvent = vi.fn(async ({ where }: { where: Partial<Event> }) => active().events.find((value) => matches(value, where)) ?? null);
  const findSource = vi.fn(async ({ where }: { where: { id: string; userId: string; deletedAt: null; status: { in: string[] } } }) => active().sources.find((value) => value.id === where.id && value.userId === where.userId && value.deletedAt === where.deletedAt && where.status.in.includes(value.status)) ?? null);
  const updateEvent = vi.fn(async ({ where, data }: { where: Partial<Event>; data: Partial<Event> }) => {
    const found = active().events.filter((value) => matches(value, where));
    found.forEach((value) => Object.assign(value, data));
    return { count: found.length };
  });
  const createEvent = vi.fn(async ({ data }: { data: Partial<Event> }) => {
    const created = event({ ...data, sourceDocumentId: data.sourceDocumentId ?? null });
    active().events.push(created);
    return created;
  });
  const createAudit = vi.fn(async ({ data }: { data: Audit }) => { active().audits.push(data); return data; });
  const transaction = {
    lifeEvent: { findFirst: findEvent, updateMany: updateEvent, create: createEvent },
    sourceDocument: { findFirst: findSource },
    auditLog: { create: createAudit },
  };
  const transact = vi.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => {
    draft = structuredClone(state);
    try {
      const result = await callback(transaction);
      state = draft;
      return result;
    } finally { draft = null; }
  });
  const database = { $transaction: transact } as unknown as PrismaClient;
  return { service: new LifeEventEntryService(database, encryption), get state() { return state; }, findEvent, findSource, updateEvent, createEvent, createAudit, transact };
}

describe("user-entered life events", () => {
  it("creates encrypted, source-linked facts without verifying the document", async () => {
    const context = fixture([]);
    await expect(context.service.create(userId, { ...creation, sourceDocumentId: sourceId })).resolves.toEqual({ eventId });
    const saved = context.state.events[0];
    expect(saved.userId).toBe(userId);
    expect(saved.sourceDocumentId).toBe(sourceId);
    expect(encryption.decrypt(saved.titleEncrypted)).toBe(creation.title);
    expect(encryption.decrypt(saved.descriptionEncrypted!)).toBe(creation.description);
    expect(encryption.decryptJson(saved.metadataEncrypted)).toEqual({ origin: "USER_ENTERED", kind: "TRIP", budget: 2500 });
    expect(context.state.sources[0].verificationStatus).toBe("UNVERIFIED");
    expect(context.state.audits).toEqual([expect.objectContaining({ action: "life_event.create", userId, actorUserId: userId, result: "SUCCESS", metadata: {} })]);
  });

  it("creates a source-free event and accepts quarantined sources", async () => {
    const sourceFree = fixture([]);
    await sourceFree.service.create(userId, creation);
    expect(sourceFree.state.events[0].sourceDocumentId).toBeNull();
    expect(sourceFree.findSource).not.toHaveBeenCalled();
    const quarantined = fixture([]);
    quarantined.state.sources[0].status = "QUARANTINED";
    await quarantined.service.create(userId, { ...creation, sourceDocumentId: sourceId });
    expect(quarantined.state.events[0].sourceDocumentId).toBe(sourceId);
  });

  it.each(["foreign", "missing", "deleted", "PENDING_UPLOAD", "UPLOADED", "REJECTED", "DELETED"])("refuses a %s source on create and replacement", async (kind) => {
    for (const operation of ["create", "replace"] as const) {
      const context = fixture(operation === "create" ? [] : [event()]);
      if (kind === "foreign") context.state.sources[0].userId = "another-owner";
      else if (kind === "missing") context.state.sources.length = 0;
      else if (kind === "deleted") context.state.sources[0].deletedAt = new Date();
      else context.state.sources[0].status = kind;
      const before = structuredClone(context.state.events);
      const result = operation === "create"
        ? context.service.create(userId, { ...creation, sourceDocumentId: sourceId })
        : context.service.replace(userId, eventId, { ...replacement, sourceDocumentId: sourceId });
      await expect(result).rejects.toBeInstanceOf(AuthorizationError);
      expect(context.state.events).toEqual(before);
      expect(context.findSource).toHaveBeenCalledWith({ where: { id: sourceId, userId, deletedAt: null, status: { in: ["QUARANTINED", "AVAILABLE"] } }, select: { id: true } });
      expect(context.state.audits).toEqual([expect.objectContaining({ result: "DENIED" })]);
    }
  });

  it("replaces only editable fields and preserves metadata, category and a deleted source link", async () => {
    const original = event();
    const context = fixture([original]);
    context.state.sources[0].deletedAt = new Date();
    await expect(context.service.replace(userId, eventId, replacement)).resolves.toEqual({ eventId });
    const saved = context.state.events[0];
    expect(encryption.decrypt(saved.titleEncrypted)).toBe(replacement.title);
    expect(encryption.decrypt(saved.descriptionEncrypted!)).toBe(replacement.description);
    expect(saved.occurredAt).toEqual(new Date(replacement.occurredAt));
    expect(saved.category).toBe(original.category);
    expect(saved.metadataEncrypted).toBe(original.metadataEncrypted);
    expect(saved.sourceDocumentId).toBe(sourceId);
    expect(saved.verificationStatus).toBe(original.verificationStatus);
    expect(context.findSource).not.toHaveBeenCalled();
    expect(context.updateEvent).toHaveBeenCalledWith(expect.objectContaining({ where: { id: eventId, userId, deletedAt: null, medicalRecordId: null, metadataEncrypted: original.metadataEncrypted } }));
  });

  it("detaches a source only when explicitly null and clears omitted description", async () => {
    const context = fixture();
    await context.service.replace(userId, eventId, { title: replacement.title, occurredAt: replacement.occurredAt, sourceDocumentId: null });
    expect(context.state.events[0].sourceDocumentId).toBeNull();
    expect(context.state.events[0].descriptionEncrypted).toBeNull();
    expect(context.findSource).not.toHaveBeenCalled();
    expect(context.state.sources).toHaveLength(1);
  });

  it("attaches an owned source during replacement without changing its verification state", async () => {
    const context = fixture([event({ sourceDocumentId: null })]);
    await context.service.replace(userId, eventId, { ...replacement, sourceDocumentId: sourceId });
    expect(context.state.events[0].sourceDocumentId).toBe(sourceId);
    expect(context.state.sources[0].verificationStatus).toBe("UNVERIFIED");
    expect(context.state.audits[0]).toEqual(expect.objectContaining({ action: "life_event.replace", result: "SUCCESS" }));
  });

  it("soft-deletes the owned event and leaves its original document intact", async () => {
    const context = fixture();
    const source = structuredClone(context.state.sources[0]);
    await expect(context.service.delete(userId, eventId)).resolves.toEqual({ eventId, status: "DELETED" });
    expect(context.state.events[0].deletedAt).toBeInstanceOf(Date);
    expect(context.state.sources[0]).toEqual(source);
    expect(context.state.audits).toEqual([expect.objectContaining({ action: "life_event.delete", resourceId: eventId, result: "SUCCESS" })]);
  });

  it.each(["missing", "foreign", "deleted", "medical-relation", "legacy-medical", "forged-user-origin", "null-medical-marker", "unknown-origin", "missing-origin"])("protects a %s event from replacement and removal", async (kind) => {
    for (const operation of ["replace", "delete"] as const) {
      const context = fixture();
      const saved = context.state.events[0];
      if (kind === "missing") context.state.events.length = 0;
      else if (kind === "foreign") saved.userId = "another-owner";
      else if (kind === "deleted") saved.deletedAt = new Date();
      else if (kind === "medical-relation") saved.medicalRecordId = "medical-record";
      else if (kind === "legacy-medical") saved.metadataEncrypted = encryption.encryptJson({ medicalRecordId: "medical-record" });
      else if (kind === "forged-user-origin") saved.metadataEncrypted = encryption.encryptJson({ origin: "USER_ENTERED", medicalRecordId: "medical-record" });
      else if (kind === "null-medical-marker") saved.metadataEncrypted = encryption.encryptJson({ origin: "USER_ENTERED", medicalRecordId: null });
      else if (kind === "unknown-origin") saved.metadataEncrypted = encryption.encryptJson({ origin: "AI_EXTRACTED" });
      else saved.metadataEncrypted = encryption.encryptJson({ kind: "TRIP" });
      const before = structuredClone(context.state.events);
      const result = operation === "replace"
        ? context.service.replace(userId, eventId, replacement)
        : context.service.delete(userId, eventId);
      await expect(result).rejects.toBeInstanceOf(AuthorizationError);
      expect(context.state.events).toEqual(before);
      expect(context.findEvent).toHaveBeenCalledWith({ where: { id: eventId, userId, deletedAt: null, medicalRecordId: null }, select: { id: true, metadataEncrypted: true } });
      expect(context.updateEvent).not.toHaveBeenCalled();
      expect(context.state.audits).toEqual([expect.objectContaining({ action: `life_event.${operation}`, resourceId: eventId, result: "DENIED" })]);
    }
  });

  it.each(["create", "replace", "delete"] as const)("rolls back %s when its transaction cannot write the audit", async (operation) => {
    const context = fixture(operation === "create" ? [] : [event()]);
    const before = structuredClone(context.state);
    context.createAudit.mockRejectedValueOnce(new Error("Audit unavailable"));
    const result = operation === "create" ? context.service.create(userId, creation)
      : operation === "replace" ? context.service.replace(userId, eventId, replacement)
        : context.service.delete(userId, eventId);
    await expect(result).rejects.toBeInstanceOf(AuditFailureError);
    expect(context.transact).toHaveBeenCalledOnce();
    expect(context.state).toEqual(before);
  });

  it("does not claim success when a concurrent change invalidates the mutation", async () => {
    const context = fixture();
    context.updateEvent.mockResolvedValueOnce({ count: 0 });
    await expect(context.service.delete(userId, eventId)).rejects.toBeInstanceOf(AuthorizationError);
    expect(context.state.events[0].deletedAt).toBeNull();
    expect(context.state.audits[0].result).toBe("DENIED");
  });

  it("rejects forged medical metadata, invalid dates and protected replacement fields before database access", async () => {
    const context = fixture();
    await expect(context.service.create(userId, { ...creation, metadata: { medicalRecordId: "medical-record" } })).rejects.toThrow();
    await expect(context.service.create(userId, { ...creation, sourceDocumentId: "" })).rejects.toThrow();
    await expect(context.service.create(userId, { ...creation, occurredAt: null })).rejects.toThrow();
    await expect(context.service.replace(userId, eventId, { ...replacement, category: "HEALTH" })).rejects.toThrow();
    await expect(context.service.replace(userId, eventId, { ...replacement, metadata: { origin: "MEDICAL" } })).rejects.toThrow();
    expect(context.transact).not.toHaveBeenCalled();
  });
});
