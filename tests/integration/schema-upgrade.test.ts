import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Never fall back to DATABASE_URL: these tests must not reach application data.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const parsedUrl = testDatabaseUrl ? new URL(testDatabaseUrl) : undefined;
if (!parsedUrl || !["postgres:", "postgresql:"].includes(parsedUrl.protocol)
  || !["localhost", "127.0.0.1"].includes(parsedUrl.hostname)
  || !parsedUrl.pathname.toLowerCase().includes("test")
  || parsedUrl.searchParams.has("host") || parsedUrl.searchParams.has("hostaddr")) {
  throw new Error("TEST_DATABASE_URL must point to a dedicated local PostgreSQL test database.");
}

const database = new Client({ connectionString: testDatabaseUrl, connectionTimeoutMillis: 5_000 });
const schema = `lifeos_upgrade_test_${randomBytes(8).toString("hex")}`;
const originalTables = ["User", "SourceDocument", "MedicalRecord", "LifeEvent", "ConsentRecord", "ExtractionJob"] as const;
const originalRows = new Map<string, Record<string, unknown>[]>();
let connected = false;
let schemaCreated = false;

async function applyMigration(name: string) {
  const sql = await readFile(new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8");
  await database.query(sql);
}

beforeAll(async () => {
  await database.connect();
  connected = true;
  await database.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  // Do not include public: every unqualified migration/fixture table belongs here.
  await database.query(`SET search_path TO "${schema}"`);
  await applyMigration("20260803070000_initial_production_foundation");

  for (const owner of ["a", "b"]) {
    await database.query(`INSERT INTO "User" ("id", "clerkUserId", "email", "displayName", "updatedAt")
      VALUES ($1, $2, $3, $4, '2026-08-01')`,
    [`owner-${owner}`, `synthetic-clerk-${owner}`, `${owner}@example.test`, `Synthetic ${owner}`]);
    await database.query(`INSERT INTO "SourceDocument"
      ("id", "userId", "originalFileNameEncrypted", "storageKey", "mimeType", "sizeBytes", "checksum", "category", "status", "updatedAt")
      VALUES ($1, $2, $3, $4, 'application/pdf', 100, $5, 'HEALTH', 'AVAILABLE', '2026-08-01')`,
    [`document-${owner}`, `owner-${owner}`, `synthetic-filename-ciphertext-${owner}`, `synthetic/${owner}/source.pdf`, owner.repeat(64)]);
    await database.query(`INSERT INTO "MedicalRecord"
      ("id", "userId", "sourceDocumentId", "recordType", "eventDate", "titleEncrypted", "structuredDataEncrypted", "updatedAt")
      VALUES ($1, $2, $3, 'REPORT', '2026-08-01', $4, $5, '2026-08-01')`,
    [`record-${owner}`, `owner-${owner}`, `document-${owner}`, `synthetic-title-ciphertext-${owner}`, `synthetic-details-ciphertext-${owner}`]);
    await database.query(`INSERT INTO "LifeEvent"
      ("id", "userId", "sourceDocumentId", "category", "titleEncrypted", "occurredAt", "metadataEncrypted", "updatedAt")
      VALUES ($1, $2, $3, 'HEALTH', $4, '2026-08-01', $5, '2026-08-01')`,
    [`event-${owner}`, `owner-${owner}`, `document-${owner}`, `synthetic-event-ciphertext-${owner}`, `synthetic-metadata-ciphertext-${owner}`]);
  }
  await database.query(`INSERT INTO "LifeEvent"
    ("id", "userId", "category", "titleEncrypted", "occurredAt", "metadataEncrypted", "updatedAt")
    VALUES ('general-event-a', 'owner-a', 'GENERAL', 'synthetic-general-ciphertext', '2026-08-02', 'synthetic-empty-metadata', '2026-08-02')`);
  await database.query(`INSERT INTO "ConsentRecord"
    ("id", "userId", "consentType", "policyVersion", "granted", "grantedAt", "createdAt")
    VALUES ('existing-consent-a', 'owner-a', 'AI_MEDICAL_EXTRACTION', 'synthetic-policy', true, '2026-08-01', '2026-08-01')`);
  await database.query(`INSERT INTO "ExtractionJob"
    ("id", "userId", "sourceDocumentId", "provider", "status", "failureReason", "updatedAt")
    VALUES ('job-a', 'owner-a', 'document-a', 'synthetic-provider', 'NEEDS_REVIEW', null, '2026-08-01'),
      ('job-b-1', 'owner-b', 'document-b', 'synthetic-provider', 'PENDING', null, '2026-08-01'),
      ('job-b-2', 'owner-b', 'document-b', 'synthetic-provider', 'FAILED', 'synthetic-provider-error', '2026-08-01')`);

  for (const table of originalTables) {
    originalRows.set(table, (await database.query(`SELECT * FROM "${table}" ORDER BY "id"`)).rows);
  }
  await applyMigration("20260910110000_ai_extraction_foundation");
  await applyMigration("20260915093000_link_medical_records_to_life_events");
}, 20_000);

afterAll(async () => {
  if (!connected) return;
  try {
    if (schemaCreated) await database.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await database.end();
  }
});

describe("upgrade from the initial production schema", () => {
  it("preserves every existing row and encrypted field while adding new columns", async () => {
    for (const table of originalTables) {
      const rows = (await database.query(`SELECT * FROM "${table}" ORDER BY "id"`)).rows;
      const originals = originalRows.get(table)!;
      expect(rows).toHaveLength(originals.length + (table === "ConsentRecord" ? 2 : 0));
      for (const original of originals) {
        const upgraded = rows.find((row) => row.id === original.id);
        expect(upgraded).toBeDefined();
        // Compare every original field, including ciphertext, dates and statuses.
        expect(Object.fromEntries(Object.keys(original).map((key) => [key, upgraded[key]]))).toEqual(original);
      }
    }
  });

  it("retains existing consent and records denied consent for jobs without it", async () => {
    const jobs = (await database.query(`SELECT job."id", job."model", job."resultEncrypted",
      consent."id" AS "consentId", consent."userId" AS "consentOwner", consent."granted", consent."grantedAt"
      FROM "ExtractionJob" AS job JOIN "ConsentRecord" AS consent ON consent."id" = job."consentRecordId"
      ORDER BY job."id"`)).rows;
    expect(jobs).toEqual([
      { id: "job-a", model: "unconfigured", resultEncrypted: null, consentId: "existing-consent-a", consentOwner: "owner-a", granted: true, grantedAt: originalRows.get("ConsentRecord")![0].grantedAt },
      { id: "job-b-1", model: "unconfigured", resultEncrypted: null, consentId: "migration-job-b-1", consentOwner: "owner-b", granted: false, grantedAt: null },
      { id: "job-b-2", model: "unconfigured", resultEncrypted: null, consentId: "migration-job-b-2", consentOwner: "owner-b", granted: false, grantedAt: null },
    ]);
    const grants = await database.query('SELECT "id" FROM "ConsentRecord" WHERE "granted" = true');
    expect(grants.rows).toEqual([{ id: "existing-consent-a" }]);
  });

  it("keeps legacy medical links nullable without guessing links from ciphertext", async () => {
    const links = await database.query('SELECT "medicalRecordId" FROM "LifeEvent"');
    expect(links.rows).toHaveLength(3);
    expect(links.rows.every((row) => row.medicalRecordId === null)).toBe(true);
    const column = await database.query(`SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'LifeEvent' AND column_name = 'medicalRecordId'`, [schema]);
    expect(column.rows).toEqual([{ is_nullable: "YES" }]);
  });

  it("allows an owned medical record link and rejects a cross-owner link", async () => {
    await database.query("BEGIN");
    try {
      const owned = await database.query(`UPDATE "LifeEvent" SET "medicalRecordId" = 'record-a'
        WHERE "id" = 'event-a' RETURNING "medicalRecordId"`);
      expect(owned.rows).toEqual([{ medicalRecordId: "record-a" }]);
      await expect(database.query(`UPDATE "LifeEvent" SET "medicalRecordId" = 'record-b'
        WHERE "id" = 'event-a'`)).rejects.toMatchObject({ code: "23503", constraint: "LifeEvent_medicalRecordId_userId_fkey" });
    } finally {
      await database.query("ROLLBACK");
    }
  });

  it("rejects linking a second timeline event to the same owned medical record", async () => {
    await database.query("BEGIN");
    try {
      await database.query(`UPDATE "LifeEvent" SET "medicalRecordId" = 'record-a' WHERE "id" = 'event-a'`);
      await expect(database.query(`UPDATE "LifeEvent" SET "medicalRecordId" = 'record-a'
        WHERE "id" = 'general-event-a'`)).rejects.toMatchObject({ code: "23505", constraint: "LifeEvent_medicalRecordId_userId_key" });
    } finally {
      await database.query("ROLLBACK");
    }
  });
});
