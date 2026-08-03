import assert from "node:assert/strict";
import test from "node:test";
import { createConfirmedMedicalEvent } from "../src/domain/factories.ts";
import { CURRENT_SCHEMA_VERSION, LOCAL_OWNER_ID, type StoredSourceDocument } from "../src/domain/models.ts";
import { validateDocumentFile, validateLifeEvent } from "../src/domain/validation.ts";

const document: StoredSourceDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: "document-1",
  ownerId: LOCAL_OWNER_ID,
  title: "Prescription — August 2026",
  filename: "prescription.pdf",
  mimeType: "application/pdf",
  size: 4,
  category: "health",
  documentDate: "2026-08-01",
  uploadedAt: "2026-08-02T00:00:00.000Z",
  storageReference: "indexeddb:documents/document-1",
  extractionStatus: "not_started",
  retentionState: "active",
  blob: new Blob(["test"], { type: "application/pdf" }),
};

test("confirmed medical review creates a verified, source-linked event", () => {
  const event = createConfirmedMedicalEvent(
    { title: " Prescription ", occurredAt: "2026-08-01", provider: " Clinic ", facts: " Take medicine after food. " },
    document,
    "event-1",
    "2026-08-02T01:00:00.000Z",
  );

  assert.deepEqual(event.source, { type: "source_document", documentId: "document-1", label: document.title });
  assert.equal(event.verificationStatus, "user_confirmed");
  assert.equal(event.origin, "user_entered");
  assert.deepEqual(event.metadata, { recordType: "medical_document_review", provider: "Clinic", confirmedFacts: "Take medicine after food." });
  assert.deepEqual(validateLifeEvent(event), []);
});

test("document validation accepts supported files and rejects unsafe inputs", () => {
  assert.deepEqual(validateDocumentFile(new File(["report"], "report.pdf", { type: "application/pdf" })), []);
  assert.match(validateDocumentFile(new File(["script"], "report.html", { type: "text/html" })).join(" "), /PDF, JPEG, or PNG/);
  assert.match(validateDocumentFile(new File([], "empty.pdf", { type: "application/pdf" })).join(" "), /non-empty/);
});
