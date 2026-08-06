import { describe, expect, it } from "vitest";
import { mergeSettings } from "@/lib/settings/merge";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";

describe("lead tags are a configured vocabulary", () => {
  it("ships a usable default set", () => {
    expect(DEFAULT_SETTINGS.taxonomy.leadTags.length).toBeGreaterThan(0);
  });

  it("lets a school replace the vocabulary wholesale", () => {
    // Arrays replace rather than merge, so a tag a school deleted stays deleted
    // instead of reappearing from the shipped defaults.
    const s = mergeSettings({ taxonomy: { leadTags: ["Scholarship", "Transport needed"] } });
    expect(s.taxonomy.leadTags).toEqual(["Scholarship", "Transport needed"]);
  });

  it("allows an empty vocabulary", () => {
    // A school that does not want tags should be able to turn them off, and the
    // UI says so rather than rendering an empty row of chips.
    const s = mergeSettings({ taxonomy: { leadTags: [] } });
    expect(s.taxonomy.leadTags).toEqual([]);
  });

  it("keeps other lists untouched when only tags change", () => {
    const s = mergeSettings({ taxonomy: { leadTags: ["A"] } });
    expect(s.taxonomy.programs).toEqual(DEFAULT_SETTINGS.taxonomy.programs);
  });
});
