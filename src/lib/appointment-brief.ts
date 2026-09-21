import type { MedicalRecordCardData } from "@/components/medical-record-card";

export type AppointmentBriefInput = {
  purpose: string;
  questions: string;
  records: MedicalRecordCardData[];
  selectedRecordIds: string[];
};

function providedText(value: string | null): string {
  return value?.trim() ? value : "Not provided";
}

/** Copies only the selected, authorized records into a plain-text appointment brief. */
export function buildAppointmentBrief(input: AppointmentBriefInput): { records: MedicalRecordCardData[]; text: string } {
  const selectedIds = new Set(input.selectedRecordIds);
  const includedIds = new Set<string>();
  const records = input.records
    .filter((record) => {
      if (!selectedIds.has(record.id) || includedIds.has(record.id)) return false;
      includedIds.add(record.id);
      return true;
    })
    .map((record, index) => {
      const timestamp = Date.parse(record.eventDate);
      return { record, index, timestamp: Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY };
    })
    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index)
    .map(({ record }) => record);

  const lines = [
    "LifeOS appointment brief",
    "",
    "Purpose (user-entered)",
    providedText(input.purpose),
    "",
    "Questions (user-entered)",
    providedText(input.questions),
    "",
    `Selected medical records: ${records.length}`,
    "Records are user confirmed. They have not been independently verified by a clinician.",
    "Medicines below are copied from historical sources; they do not establish current use.",
  ];

  if (records.length === 0) lines.push("No medical records selected.");

  for (const record of records) {
    lines.push(
      "",
      `Record ID: ${record.id}`,
      "Verification: User confirmed",
      `Date shown in the source: ${record.eventDate}`,
      `Record type: ${record.recordType}`,
      `Title: ${record.title}`,
      `Hospital or clinician: ${providedText(record.providerName)}`,
      `Source summary: ${providedText(record.summary)}`,
      "Medicines copied from this historical source (current use is not confirmed):",
    );

    if (record.medications.length === 0) {
      lines.push("No medicines recorded in this entry.");
    } else {
      for (const medication of record.medications) {
        lines.push(`- ${medication.name}`, `  Source instructions: ${providedText(medication.instructions)}`);
      }
    }

    lines.push(
      `Source filename: ${record.sourceDocument.originalFileName}`,
      `Source document ID: ${record.sourceDocument.id}`,
      record.sourceDocument.available
        ? "Source availability: Original document is available in your private LifeOS vault."
        : "Source availability: Original document was deleted or is unavailable; it cannot be checked against this brief.",
    );
  }

  return { records, text: `${lines.join("\n")}\n` };
}
