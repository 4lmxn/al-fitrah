import { describe, expect, it } from "vitest";
import { mergeSettings } from "@/lib/settings/merge";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";
import { settingsSchema } from "@/lib/settings/schema";

/**
 * The editor's contract with the data model. These guard the rules the UI
 * relies on, which are easy to break from either side.
 */
describe("pipeline editing rules", () => {
  const base = DEFAULT_SETTINGS.pipelines.admission_inquiry.stages;

  it("keeps a stage's id when only its label changes", () => {
    // A lead stores its stage by id. Re-deriving the id from an edited label
    // would orphan every lead sitting on that stage.
    const renamed = base.map((s) => (s.id === "visited" ? { ...s, label: "Campus Visit" } : s));
    const merged = mergeSettings({ pipelines: { admission_inquiry: { label: "Admission inquiry", stages: renamed } } });
    const stage = merged.pipelines.admission_inquiry.stages.find((s) => s.label === "Campus Visit");
    expect(stage?.id).toBe("visited");
  });

  it("accepts stages the code has never shipped", () => {
    const stages = [
      { id: "new", label: "New", group: "new" as const, terminal: false },
      { id: "documents_pending", label: "Documents Pending", group: "active" as const, terminal: false },
      { id: "interview_scheduled", label: "Interview Scheduled", group: "active" as const, terminal: false },
      { id: "accepted", label: "Accepted", group: "won" as const, terminal: true },
      { id: "rejected", label: "Rejected", group: "lost" as const, terminal: true },
    ];
    const merged = mergeSettings({ pipelines: { admission_inquiry: { label: "Admissions", stages } } });
    expect(merged.pipelines.admission_inquiry.stages.map((s) => s.id)).toEqual(stages.map((s) => s.id));
  });

  it("rejects a pipeline with fewer than two stages", () => {
    const r = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      pipelines: { ...DEFAULT_SETTINGS.pipelines, admission_inquiry: { label: "X", stages: [base[0]] } },
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown group rather than silently defaulting it", () => {
    const r = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      pipelines: {
        ...DEFAULT_SETTINGS.pipelines,
        admission_inquiry: { label: "X", stages: [base[0], { id: "x", label: "X", group: "maybe", terminal: false }] },
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("list editing", () => {
  it("replaces a list entirely, so a removed entry stays removed", () => {
    const merged = mergeSettings({ taxonomy: { classSections: ["Rose", "Tulip"] } });
    expect(merged.taxonomy.classSections).toEqual(["Rose", "Tulip"]);
  });

  it("leaves untouched lists at their defaults", () => {
    const merged = mergeSettings({ taxonomy: { classSections: ["Rose"] } });
    expect(merged.taxonomy.programs).toEqual(DEFAULT_SETTINGS.taxonomy.programs);
  });
});

describe("operations rules", () => {
  it("rejects a month outside 1-12", () => {
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, academicYear: { startMonth: 13 } }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, academicYear: { startMonth: 0 } }).success).toBe(false);
  });

  it("rejects a threshold outside 0-100", () => {
    const bad = { ...DEFAULT_SETTINGS, attendance: { ...DEFAULT_SETTINGS.attendance, lowAttendancePercent: 140 } };
    expect(settingsSchema.safeParse(bad).success).toBe(false);
  });

  it("allows every day to be a school day", () => {
    const ok = { ...DEFAULT_SETTINGS, attendance: { ...DEFAULT_SETTINGS.attendance, nonSchoolDays: [] } };
    expect(settingsSchema.safeParse(ok).success).toBe(true);
  });
});
