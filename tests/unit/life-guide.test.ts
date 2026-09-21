import { describe, expect, it } from "vitest";
import { answerLifeQuestion, type GuideFact } from "@/lib/life-guide";

const facts: GuideFact[] = [
  {
    id: "medical-1",
    category: "HEALTH",
    title: "Follow-up prescription",
    description: "The source lists a follow-up prescription.",
    occurredAt: "2026-02-10",
    occurredAtLabel: "10 Feb 2026",
    provenance: "USER_CONFIRMED",
    kind: "PRESCRIPTION",
    recordType: "PRESCRIPTION",
    providerName: "Community Clinic",
    medications: [{ name: "Example medicine", instructions: "Once daily" }],
    sourceDocument: { id: "source-1", originalFileName: "prescription.png", available: true },
    href: "/medical",
  },
  {
    id: "trip-1",
    category: "TRAVEL",
    title: "Pokhara trip",
    description: "Hotel and bus notes",
    occurredAt: "2026-11-12",
    occurredAtLabel: "12 Nov 2026",
    provenance: "USER_ENTERED",
    kind: "TRIP",
    recordType: null,
    providerName: null,
    medications: [],
    sourceDocument: null,
    href: "/timeline",
  },
  {
    id: "appointment-1",
    category: "GENERAL",
    title: "Dental follow-up",
    description: "Bring the previous report",
    occurredAt: "2026-09-16",
    occurredAtLabel: "16 Sep 2026",
    provenance: "USER_ENTERED",
    kind: "APPOINTMENT",
    recordType: null,
    providerName: null,
    medications: [],
    sourceDocument: null,
    href: "/appointments",
  },
];

describe("source-grounded Life Guide", () => {
  it("finds the latest health record without treating question words as facts", () => {
    const result = answerLifeQuestion("Show my recent health records", facts, new Date("2026-09-15T00:00:00Z"));
    expect(result.matches.map((fact) => fact.id)).toEqual(["medical-1"]);
    expect(result.answer).toContain("latest");
  });

  it("adds a medical safety caveat to medicine answers", () => {
    const result = answerLifeQuestion("What medicines are listed in my records?", facts);
    expect(result.matches[0].medications[0].name).toBe("Example medicine");
    expect(result.caveat).toContain("not what you currently take");
  });

  it("finds upcoming user-entered plans", () => {
    const result = answerLifeQuestion("What are my upcoming plans?", facts, new Date("2026-09-15T00:00:00Z"));
    expect(result.matches.map((fact) => fact.id)).toEqual(["appointment-1", "trip-1"]);
  });

  it("understands a plural appointment question", () => {
    const result = answerLifeQuestion("What are my upcoming appointments?", facts, new Date("2026-09-15T18:30:00Z"));
    expect(result.matches.map((fact) => fact.id)).toEqual(["appointment-1"]);
  });

  it("refuses to invent an answer when no saved evidence matches", () => {
    const result = answerLifeQuestion("Where is my citizenship certificate?", facts);
    expect(result.matches).toEqual([]);
    expect(result.answer).toContain("could not find");
  });
});
