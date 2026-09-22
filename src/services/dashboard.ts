import "server-only";
import { listLifeEventsForUser } from "@/repositories/life-events";
import { listMedicalRecordsForUser } from "@/repositories/medical-records";
import { listSourceDocumentsForUser } from "@/repositories/source-documents";

export async function loadDashboardForUser(userId: string) {
  try {
    const [documents, medicalRecords, lifeEvents] = await Promise.all([
      listSourceDocumentsForUser(userId),
      listMedicalRecordsForUser(userId),
      listLifeEventsForUser(userId),
    ]);
    return { documents, medicalRecords, lifeEvents };
  } catch (error) {
    // Only fixed diagnostic codes enter runtime logs. Do not log Prisma's raw
    // errors, which can include queries, private values or connection details.
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    const reason = code === "P2022" || code === "P2021" ? "DATABASE_SCHEMA_OUTDATED"
      : code === "P1001" || code === "P1002" ? "DATABASE_UNAVAILABLE"
        : "DASHBOARD_READ_FAILED";
    console.error("[lifeos] dashboard_load_failed", { reason });
    throw new Error("LifeOS could not load the dashboard.");
  }
}
