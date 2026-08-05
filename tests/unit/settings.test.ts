import { describe, expect, it, vi, afterEach } from "vitest";
import { mergeSettings } from "@/lib/settings/merge";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";

afterEach(() => vi.restoreAllMocks());

describe("mergeSettings", () => {
  it("returns the shipped defaults for an empty document", () => {
    // The platform must run before anyone has configured anything.
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("overlays only what is set, leaving the rest at defaults", () => {
    const s = mergeSettings({ school: { name: "Another School" } });
    expect(s.school.name).toBe("Another School");
    expect(s.school.phone).toBe(DEFAULT_SETTINGS.school.phone);
    expect(s.taxonomy.programs).toEqual(DEFAULT_SETTINGS.taxonomy.programs);
  });

  it("REPLACES arrays rather than concatenating them", () => {
    // A school configuring three sections means three. Merging into the shipped
    // six would resurrect sections they deliberately removed, and attendance
    // would keep offering a class that no longer exists.
    const s = mergeSettings({ taxonomy: { classSections: ["A", "B", "C"] } });
    expect(s.taxonomy.classSections).toEqual(["A", "B", "C"]);
  });

  it("ignores keys the schema does not know", () => {
    // A stale document must not reintroduce a setting that was removed.
    const s = mergeSettings({ school: { name: "X", retiredSetting: true }, ghost: 1 });
    expect(s.school.name).toBe("X");
    expect(s).not.toHaveProperty("ghost");
    expect(s.school).not.toHaveProperty("retiredSetting");
  });

  it("falls back to defaults when the stored document is invalid", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // A pipeline with one stage violates the schema's min(2).
    const s = mergeSettings({ pipelines: { admission_inquiry: { label: "X", stages: [] } } });
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(spy).toHaveBeenCalled();
  });

  it("keeps a null or undefined value from clearing a default", () => {
    const s = mergeSettings({ school: { name: null, phone: undefined } });
    expect(s.school.name).toBe(DEFAULT_SETTINGS.school.name);
    expect(s.school.phone).toBe(DEFAULT_SETTINGS.school.phone);
  });
});

describe("shipped defaults mirror the previously hardcoded constants", () => {
  it("keeps both pipelines and their terminal stages", () => {
    const admission = DEFAULT_SETTINGS.pipelines.admission_inquiry.stages;
    expect(admission.map((s) => s.id)).toEqual(["new", "contacted", "visited", "applied", "admitted", "lost"]);
    // Terminal stages drive follow-up clearing and the attention query.
    expect(admission.filter((s) => s.terminal).map((s) => s.id)).toEqual(["admitted", "lost"]);
  });

  it("marks excused as not counted, which is the rule the percentage depends on", () => {
    const excused = DEFAULT_SETTINGS.attendance.statuses.find((s) => s.id === "excused")!;
    expect(excused).toMatchObject({ present: false, counted: false });
  });

  it("leaves the grievance officer blank so the boot warning still fires", () => {
    expect(DEFAULT_SETTINGS.school.grievanceOfficerName).toBe("");
  });
});
