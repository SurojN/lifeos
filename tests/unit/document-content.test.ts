import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readDocumentBytes, verifyDocumentBytes } from "@/lib/storage/document-content";
import { attachmentDisposition } from "@/lib/storage/download-filename";

describe("private document content", () => {
  it("reads actual Node/S3 streams without relying on a nonexistent SDK method", async () => {
    const stream = Readable.from([Buffer.from("%PDF-"), Buffer.from("synthetic")]);
    expect(Buffer.from(await readDocumentBytes(stream)).toString()).toBe("%PDF-synthetic");
  });

  it("stops oversized streams and closes them", async () => {
    const stream = Readable.from([Buffer.alloc(8), Buffer.alloc(8)]);
    await expect(readDocumentBytes(stream, 10)).rejects.toThrow("size limit");
    expect(stream.destroyed).toBe(true);
  });

  it("rejects oversized buffers and unreadable bodies", async () => {
    await expect(readDocumentBytes(Buffer.alloc(11), 10)).rejects.toThrow("size limit");
    await expect(readDocumentBytes(undefined)).rejects.toThrow("could not be read");
  });

  it.each([
    ["application/pdf", Buffer.from("%PDF-1.7 synthetic")],
    ["image/png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    ["image/jpeg", Buffer.from([255, 216, 255, 224, 0])],
  ])("checks actual %s bytes and checksum", (mimeType, bytes) => {
    const checksum = createHash("sha256").update(bytes).digest("hex");
    expect(() => verifyDocumentBytes(bytes, mimeType, checksum)).not.toThrow();
    expect(() => verifyDocumentBytes(bytes, mimeType, "0".repeat(64))).toThrow();
    expect(() => verifyDocumentBytes(Buffer.from("<script>bad</script>"), mimeType, checksum)).toThrow();
  });
});

describe("download filename headers", () => {
  it("preserves Nepali and emoji filenames in a valid HTTP header", () => {
    const fileName = "रिपोर्ट 🩺.pdf";
    const disposition = attachmentDisposition(fileName);
    expect(() => new Response(null, { headers: { "content-disposition": disposition } })).not.toThrow();
    expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent(fileName)}`);
  });

  it("sanitizes header injection, paths, and malformed Unicode", () => {
    const disposition = attachmentDisposition('../report"\r\n\\\u0000\ud800.pdf');
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(() => new Headers({ "content-disposition": disposition })).not.toThrow();
    expect(attachmentDisposition("")).toContain('filename="document"');
  });
});
