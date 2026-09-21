import { describe, expect, it } from "vitest";
import type { MedicalRecordCardData } from "@/components/medical-record-card";
import { buildAppointmentBrief } from "@/lib/appointment-brief";

function record(overrides: Partial<MedicalRecordCardData> = {}): MedicalRecordCardData {
  return {
    id: "record-one",
    recordType: "PRESCRIPTION",
    eventDate: "2026-01-12",
    eventDateLabel: "12 January 2026",
    title: "Follow-up prescription",
    summary: "Copied from the source.",
    providerName: "Example Clinic",
    medications: [{ name: "Example medicine", instructions: "As written in the source" }],
    sourceDocument: { id: "source-one", originalFileName: "prescription.pdf", available: true },
    ...overrides,
  };
}

describe("appointment brief", () => {
  it("supports an empty brief without inventing information", () => {
    const result = buildAppointmentBrief({ purpose: "", questions: "", records: [], selectedRecordIds: [] });

    expect(result.records).toEqual([]);
    expect(result.text).toContain("Purpose (user-entered)\nNot provided");
    expect(result.text).toContain("Questions (user-entered)\nNot provided");
    expect(result.text).toContain("No medical records selected.");
    expect(result.text).not.toContain("Record ID:");
  });

  it("exports only selected records and their exact confirmed fields and sources", () => {
    const included = record();
    const excluded = record({ id: "private-other", title: "Unselected private title", summary: "Unselected private summary", sourceDocument: { id: "private-source", originalFileName: "unselected.pdf", available: true } });
    const result = buildAppointmentBrief({ purpose: "Discuss this report", questions: "What does this result mean?", records: [included, excluded], selectedRecordIds: [included.id] });

    expect(result.records).toEqual([included]);
    expect(result.text).toContain("Purpose (user-entered)\nDiscuss this report");
    expect(result.text).toContain("Questions (user-entered)\nWhat does this result mean?");
    expect(result.text).toContain("Verification: User confirmed");
    expect(result.text).toContain(`Date shown in the source: ${included.eventDate}`);
    expect(result.text).toContain(`Record type: ${included.recordType}`);
    expect(result.text).toContain(`Title: ${included.title}`);
    expect(result.text).toContain(`Source summary: ${included.summary}`);
    expect(result.text).toContain(`Hospital or clinician: ${included.providerName}`);
    expect(result.text).toContain(`Source filename: ${included.sourceDocument.originalFileName}`);
    expect(result.text).toContain(`Source document ID: ${included.sourceDocument.id}`);
    expect(result.text).not.toMatch(/Unselected|private-other|private-source|unselected.pdf/);
  });

  it("does not include any supplied record without explicit selection", () => {
    const result = buildAppointmentBrief({ purpose: "", questions: "", records: [record()], selectedRecordIds: [] });

    expect(result.records).toEqual([]);
    expect(result.text).not.toContain("prescription.pdf");
    expect(result.text).not.toContain("Example medicine");
  });

  it("ignores unknown selections and deduplicates selected IDs and supplied records", () => {
    const selected = record();
    const result = buildAppointmentBrief({ purpose: "", questions: "", records: [selected, selected], selectedRecordIds: ["unknown", selected.id, selected.id] });

    expect(result.records).toEqual([selected]);
    expect(result.text.match(/Record ID: record-one/g)).toHaveLength(1);
    expect(result.text).not.toContain("unknown");
  });

  it("orders newest first, preserves supplied order for equal dates, and leaves the input unchanged", () => {
    const earlier = record({ id: "earlier", eventDate: "2025-12-31" });
    const recentFirst = record({ id: "recent-first", eventDate: "2026-01-12" });
    const recentSecond = record({ id: "recent-second", eventDate: "2026-01-12" });
    const records = [earlier, recentFirst, recentSecond];
    const selectedRecordIds = [recentSecond.id, earlier.id, recentFirst.id];
    const input = { purpose: "", questions: "", records, selectedRecordIds };
    const result = buildAppointmentBrief(input);

    expect(result.records.map(({ id }) => id)).toEqual([recentFirst.id, recentSecond.id, earlier.id]);
    expect(result.text.indexOf("Record ID: recent-first")).toBeLessThan(result.text.indexOf("Record ID: recent-second"));
    expect(result.text.indexOf("Record ID: recent-second")).toBeLessThan(result.text.indexOf("Record ID: earlier"));
    expect(buildAppointmentBrief(input)).toEqual(result);
    expect(records).toEqual([earlier, recentFirst, recentSecond]);
    expect(selectedRecordIds).toEqual([recentSecond.id, earlier.id, recentFirst.id]);
  });

  it("labels missing optional fields without treating missing medicines as evidence of no medication use", () => {
    const selected = record({ providerName: null, summary: null, medications: [] });
    const result = buildAppointmentBrief({ purpose: "  ", questions: "", records: [selected], selectedRecordIds: [selected.id] });

    expect(result.text).toContain("Hospital or clinician: Not provided");
    expect(result.text).toContain("Source summary: Not provided");
    expect(result.text).toContain("No medicines recorded in this entry.");
    expect(result.text).not.toContain("undefined");
    expect(result.text).not.toContain("null");
  });

  it("retains a deleted source reference and clearly marks the original as unavailable", () => {
    const selected = record({ sourceDocument: { id: "deleted-source", originalFileName: "deleted.pdf", available: false } });
    const result = buildAppointmentBrief({ purpose: "", questions: "", records: [selected], selectedRecordIds: [selected.id] });

    expect(result.text).toContain("Source filename: deleted.pdf");
    expect(result.text).toContain("Source document ID: deleted-source");
    expect(result.text).toContain("Original document was deleted or is unavailable");
    expect(result.text).not.toContain("Original document is available");
  });

  it("preserves user and source text literally instead of generating HTML or inferred content", () => {
    const selected = record({ title: "<b>Literal title & text</b>", summary: "First line\nSecond line" });
    const result = buildAppointmentBrief({ purpose: "  <script>literal text</script>  ", questions: "First question?\nSecond question?", records: [selected], selectedRecordIds: [selected.id] });

    expect(result.text).toContain("Purpose (user-entered)\n  <script>literal text</script>  \n");
    expect(result.text).toContain("Questions (user-entered)\nFirst question?\nSecond question?");
    expect(result.text).toContain("Title: <b>Literal title & text</b>");
    expect(result.text).toContain("Source summary: First line\nSecond line");
    expect(result.text).not.toContain("&lt;");
    expect(result.text).not.toContain("<html");
    expect(result.text).not.toContain("<a href");
  });

  it("labels medicine details as historical and never establishes current use", () => {
    const selected = record({ medications: [{ name: "Historical medicine", instructions: "" }] });
    const result = buildAppointmentBrief({ purpose: "", questions: "", records: [selected], selectedRecordIds: [selected.id] });

    expect(result.text).toContain("Medicines below are copied from historical sources; they do not establish current use.");
    expect(result.text).toContain("Medicines copied from this historical source (current use is not confirmed):");
    expect(result.text).toContain("- Historical medicine\n  Source instructions: Not provided");
  });
});
