import { describe, expect, it } from "vitest";
import { toTimelineEvent } from "@/lib/timeline-event";

const saved = {
  id: "event-one", category: "TRAVEL", verificationStatus: "USER_CONFIRMED", title: "Trip", description: null,
  occurredAt: new Date("2026-10-02T18:30:45.123Z"), metadata: { origin: "USER_ENTERED", kind: "TRIP" },
  medicalRecordId: null, sourceFileName: "ticket.pdf", sourceDocumentId: "document-one", sourceAvailable: true,
};

describe("timeline display mapping", () => {
  it("preserves exact timestamps, provenance and source references", () => {
    const event = toTimelineEvent(saved);
    expect(event).toMatchObject({ id: saved.id, occurredAt: "2026-10-02T18:30:45.123Z", userEntered: true, canEdit: true, sourceDocumentId: "document-one", sourceFileName: "ticket.pdf", sourceAvailable: true });
    expect(event).not.toHaveProperty("metadata");
  });

  it("routes structured finance and medical edits to their managed workflows", () => {
    expect(toTimelineEvent({ ...saved, category: "FINANCE", metadata: { origin: "USER_ENTERED", financeVersion: 1 } })).toMatchObject({ financeRecord: true, canEdit: false });
    expect(toTimelineEvent({ ...saved, medicalRecordId: "medical-one" })).toMatchObject({ medicalRecord: true, canEdit: false });
    expect(toTimelineEvent({ ...saved, metadata: { origin: "USER_ENTERED", medicalRecordId: null } })).toMatchObject({ medicalRecord: true, canEdit: false });
  });

  it("does not grant editing or invent provenance for legacy and malformed metadata", () => {
    for (const metadata of [null, [], "USER_ENTERED", { origin: "AI_EXTRACTED" }, { kind: "TRIP" }]) {
      expect(toTimelineEvent({ ...saved, metadata })).toMatchObject({ userEntered: false, canEdit: false });
    }
  });

  it("labels appointment times in Nepal time without changing the saved instant", () => {
    const event = toTimelineEvent({ ...saved, metadata: { kind: "APPOINTMENT", origin: "USER_ENTERED" } });
    expect(event.occurredAtLabel).toContain("Nepal time");
    expect(event.occurredAtLabel).toMatch(/(?:Oct 3, 2026|3 Oct 2026)/);
    expect(event.occurredAt).toBe(saved.occurredAt.toISOString());
  });
});
