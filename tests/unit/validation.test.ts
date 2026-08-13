import { describe, expect, it } from "vitest";
import { documentUploadSchema, MAX_UPLOAD_BYTES } from "@/validation/documents";
import { resourceIdSchema, sha256Schema } from "@/validation/common";
import { medicalRecordConfirmationSchema } from "@/validation/medical-records";
import { userLifeEventSchema } from "@/validation/life-events";

const validUpload = { originalFileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024, checksum: "a".repeat(64), category: "HEALTH" };

describe("document validation", () => {
  it("rejects unsupported MIME types", () => { expect(() => documentUploadSchema.parse({ ...validUpload, mimeType: "text/html" })).toThrow(); });
  it("rejects oversized uploads", () => { expect(() => documentUploadSchema.parse({ ...validUpload, sizeBytes: MAX_UPLOAD_BYTES + 1 })).toThrow(); });
  it("rejects invalid checksums", () => { expect(() => sha256Schema.parse("not-a-checksum")).toThrow(); });
  it("rejects malformed resource IDs", () => { expect(() => resourceIdSchema.parse("../another-user")).toThrow(); });
});

describe("user life events", () => {
  const valid = { category: "TRAVEL", kind: "TRIP", title: "Pokhara visit", occurredAt: "2026-10-01", metadata: {} };
  it("accepts a user-owned trip plan", () => { expect(userLifeEventSchema.parse(valid).category).toBe("TRAVEL"); });
  it("rejects arbitrary categories", () => { expect(() => userLifeEventSchema.parse({ ...valid, category: "BANK" })).toThrow(); });
  it("rejects nested unbounded metadata", () => { expect(() => userLifeEventSchema.parse({ ...valid, metadata: { secret: { nested: true } } })).toThrow(); });
});

describe("medical record confirmation", () => {
  const valid = { sourceDocumentId: "doc_123", recordType: "PRESCRIPTION", eventDate: "2025-01-01", title: "Reviewed prescription", medications: [] };
  it("coerces a reviewed date", () => { expect(medicalRecordConfirmationSchema.parse(valid).eventDate).toBeInstanceOf(Date); });
  it("rejects invented record types", () => { expect(() => medicalRecordConfirmationSchema.parse({ ...valid, recordType: "DIAGNOSIS" })).toThrow(); });
  it("rejects unknown fields", () => { expect(() => medicalRecordConfirmationSchema.parse({ ...valid, aiConfidence: 1 })).toThrow(); });
});
