import { describe, expect, it } from "vitest";
import { documentUploadSchema, MAX_UPLOAD_BYTES } from "@/validation/documents";
import { resourceIdSchema, sha256Schema } from "@/validation/common";

const validUpload = { originalFileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024, checksum: "a".repeat(64), category: "HEALTH" };

describe("document validation", () => {
  it("rejects unsupported MIME types", () => { expect(() => documentUploadSchema.parse({ ...validUpload, mimeType: "text/html" })).toThrow(); });
  it("rejects oversized uploads", () => { expect(() => documentUploadSchema.parse({ ...validUpload, sizeBytes: MAX_UPLOAD_BYTES + 1 })).toThrow(); });
  it("rejects invalid checksums", () => { expect(() => sha256Schema.parse("not-a-checksum")).toThrow(); });
  it("rejects malformed resource IDs", () => { expect(() => resourceIdSchema.parse("../another-user")).toThrow(); });
});
