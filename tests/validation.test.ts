import assert from "node:assert/strict";
import test from "node:test";
import { createUserEnteredEvent } from "../src/domain/factories.ts";
import { validateLifeEvent } from "../src/domain/validation.ts";

test("a user-entered event has explicit provenance and verification state", () => {
  const event = createUserEnteredEvent({ title: " Check-up ", category: "health", occurredAt: "2026-08-01", sourceLabel: " Paper report " }, "event-1", "2026-08-02T00:00:00.000Z");
  assert.equal(event.title, "Check-up");
  assert.deepEqual(event.source, { type: "user_entry", label: "Paper report" });
  assert.equal(event.verificationStatus, "unverified");
  assert.deepEqual(validateLifeEvent(event), []);
});

test("document provenance requires a source document id", () => {
  const event = createUserEnteredEvent({ title: "Check-up", category: "health", occurredAt: "2026-08-01" }, "event-1", "2026-08-02T00:00:00.000Z");
  event.source = { type: "source_document", label: "Report" };
  assert.match(validateLifeEvent(event).join(" "), /document id/);
});
