import "server-only";
import { createHash } from "node:crypto";
import { MAX_UPLOAD_BYTES } from "@/validation/documents";

// Consume SDK/Node/Web streams with a hard bound, including chunked responses.
export async function readDocumentBytes(body: unknown, limit = MAX_UPLOAD_BYTES): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    if (body.byteLength > limit) throw new Error("Document exceeds the size limit.");
    return body;
  }
  if (!body || typeof (body as AsyncIterable<unknown>)[Symbol.asyncIterator] !== "function") {
    throw new Error("The private document body could not be read.");
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of body as AsyncIterable<unknown>) {
    if (!(chunk instanceof Uint8Array)) throw new Error("Invalid document stream.");
    size += chunk.byteLength;
    if (size > limit) throw new Error("Document exceeds the size limit.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

export function verifyDocumentBytes(bytes: Uint8Array, mimeType: string, checksum: string) {
  const signature = Buffer.from(bytes.subarray(0, 8));
  const matches = mimeType === "application/pdf" ? signature.subarray(0, 5).equals(Buffer.from("%PDF-"))
    : mimeType === "image/png" ? signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mimeType === "image/jpeg" && signature.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!matches || createHash("sha256").update(bytes).digest("hex") !== checksum) {
    throw new Error("Uploaded object verification failed.");
  }
}
