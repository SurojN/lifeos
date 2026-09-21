import { describe, expect, it } from "vitest";
import { matchesPersonalSearch } from "@/lib/personal-search";

describe("personal history search", () => {
  it("matches every word across multiple sourced fields", () => {
    expect(matchesPersonalSearch("clinic medicine", ["Clinic visit", "Daily medicine"])).toBe(true);
  });

  it("is case-insensitive and trims extra spaces", () => {
    expect(matchesPersonalSearch("  PRESCRIPTION ", ["Follow-up Prescription"])).toBe(true);
  });

  it("does not return a partial multi-word match", () => {
    expect(matchesPersonalSearch("clinic missing", ["Clinic visit", "Daily medicine"])).toBe(false);
  });

  it("treats an empty query as no filter", () => {
    expect(matchesPersonalSearch("", [])).toBe(true);
  });
});
