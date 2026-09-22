import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { loadDashboardForUser } from "@/services/dashboard";

const reads = vi.hoisted(() => ({ documents: vi.fn(), medical: vi.fn(), events: vi.fn() }));
vi.mock("@/repositories/source-documents", () => ({ listSourceDocumentsForUser: reads.documents }));
vi.mock("@/repositories/medical-records", () => ({ listMedicalRecordsForUser: reads.medical }));
vi.mock("@/repositories/life-events", () => ({ listLifeEventsForUser: reads.events }));

beforeEach(() => {
  vi.clearAllMocks();
  reads.documents.mockResolvedValue([]);
  reads.medical.mockResolvedValue([]);
  reads.events.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("dashboard data loading", () => {
  it("scopes every repository read to the signed-in internal user", async () => {
    await expect(loadDashboardForUser("internal-owner")).resolves.toEqual({ documents: [], medicalRecords: [], lifeEvents: [] });
    for (const read of Object.values(reads)) expect(read).toHaveBeenCalledWith("internal-owner");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("reports a missing migration without exposing database error details", async () => {
    reads.events.mockRejectedValue(Object.assign(new Error("private query and medical detail"), { code: "P2022", meta: { private: "value" } }));
    await expect(loadDashboardForUser("internal-owner")).rejects.toThrow("LifeOS could not load the dashboard.");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[lifeos] dashboard_load_failed", { reason: "DATABASE_SCHEMA_OUTDATED" });
  });

  it("does not turn a failed audit/decryption read into an empty or partial history", async () => {
    reads.documents.mockResolvedValue([{ id: "private-source" }]);
    reads.medical.mockRejectedValue(new Error("audit failed with sensitive content"));
    await expect(loadDashboardForUser("internal-owner")).rejects.toThrow("LifeOS could not load the dashboard.");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[lifeos] dashboard_load_failed", { reason: "DASHBOARD_READ_FAILED" });
  });
});
