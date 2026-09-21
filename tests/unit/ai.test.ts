import { describe, expect, it } from "vitest";
import { medicalExtractionSchema } from "@/lib/ai/types";
import { OpenAICompatibleMedicalExtractionProvider } from "@/lib/ai/openai-compatible";

describe("medical extraction boundaries", () => {
  it("accepts structured, explicitly sourced suggestions", () => {
    expect(medicalExtractionSchema.parse({
      recordType: "PRESCRIPTION",
      eventDate: "2026-09-10",
      providerName: "Clinic",
      title: "Follow-up prescription",
      summary: "The source lists a follow-up prescription.",
      medications: [{ name: "Medicine", instructions: "Once daily" }],
      confidence: 0.8,
      sourceNotes: ["Date is visible in the header."],
    }).confidence).toBe(0.8);
  });

  it("rejects unsupported model output fields", () => {
    expect(() => medicalExtractionSchema.parse({
      recordType: "OTHER",
      eventDate: null,
      providerName: null,
      title: "Document",
      summary: null,
      medications: [],
      confidence: 0.4,
      sourceNotes: [],
      diagnosis: "inferred",
    })).toThrow();
  });

  it("fails clearly before sending unsupported document types", async () => {
    const provider = new OpenAICompatibleMedicalExtractionProvider("https://example.test/v1", "key", "model");
    await expect(provider.extractMedicalDocument({ bytes: new Uint8Array(), mimeType: "application/pdf", fileName: "report.pdf" })).rejects.toThrow("supports JPEG and PNG");
  });
});
