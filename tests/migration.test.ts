import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_SCHEMA_VERSION, LOCAL_OWNER_ID, type RetirementPlan } from "../src/domain/models.ts";
import { migrateLegacyEvent, migrateLegacyEvents, migrateLegacyPlan, migrateStoredDocument } from "../src/storage/migration.ts";

const defaultPlan: RetirementPlan = { currentAge: 30, retirementAge: 60, currentSavings: 0, monthlyContribution: 5000, expectedAnnualReturn: 10, expectedInflation: 6, desiredMonthlyExpense: 50000 };

test("migrates a v0.1 event without losing its source or notes", () => {
  const migrated = migrateLegacyEvent({ id: "event-1", title: "Blood report", category: "health", occurredOn: "2026-07-14", source: "Lab paper", notes: "Haemoglobin recorded", createdAt: "2026-07-15T00:00:00.000Z" });
  assert.deepEqual(migrated, {
    schemaVersion: CURRENT_SCHEMA_VERSION, id: "event-1", userId: LOCAL_OWNER_ID, category: "health", title: "Blood report", description: "Haemoglobin recorded", occurredAt: "2026-07-14", createdAt: "2026-07-15T00:00:00.000Z",
    source: { type: "user_entry", label: "Lab paper" }, verificationStatus: "unverified", origin: "user_entered", metadata: { migratedFrom: "v0.1" }, tags: [], relatedEventIds: [],
  });
});

test("maps old personal and learning categories to the v0.2 vocabulary", () => {
  const migrated = migrateLegacyEvents([
    { id: "1", title: "One", category: "personal", occurredOn: "2026-01-01" },
    { id: "2", title: "Two", category: "learning", occurredOn: "2026-01-02" },
  ]);
  assert.deepEqual(migrated.map(event => event.category), ["general", "education"]);
});

test("skips malformed legacy events instead of corrupting the new store", () => {
  assert.deepEqual(migrateLegacyEvents([{ id: "missing-date", title: "Invalid" }, null, "bad"]), []);
});

test("migrates valid retirement values and rejects negative values", () => {
  const migrated = migrateLegacyPlan({ currentAge: 40, monthlyContribution: -20 }, defaultPlan);
  assert.equal(migrated.currentAge, 40);
  assert.equal(migrated.monthlyContribution, 0);
  assert.equal(migrated.retirementAge, 60);
});

test("migrates a v0.1 document blob and metadata", () => {
  const blob = new Blob(["document"], { type: "application/pdf" });
  const migrated = migrateStoredDocument({ id: "doc-1", title: "Report", category: "health", occurredOn: "2026-07-14", fileName: "report.pdf", fileType: "application/pdf", fileSize: blob.size, createdAt: "2026-07-15T00:00:00.000Z", blob });
  assert.equal(migrated?.filename, "report.pdf");
  assert.equal(migrated?.ownerId, LOCAL_OWNER_ID);
  assert.equal(migrated?.storageReference, "indexeddb:documents/doc-1");
  assert.equal(migrated?.extractionStatus, "not_started");
  assert.equal(migrated?.blob, blob);
});
