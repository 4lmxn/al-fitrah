import { describe, it, expect } from "vitest";
import { PIPELINES, isValidStage, LEAD_TYPE_LABEL, normalizeStage } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";

describe("lead pipelines", () => {
  it("defines the student pipeline in order", () => {
    expect(PIPELINES.admission_inquiry).toEqual([
      "new", "contacted", "visited", "applied", "admitted", "lost",
    ]);
  });

  it("defines the staff pipeline in order", () => {
    expect(PIPELINES.staff_application).toEqual([
      "new", "reviewing", "interview", "hired", "rejected",
    ]);
  });

  it("accepts a stage valid for the type", () => {
    expect(isValidStage("admission_inquiry", "visited")).toBe(true);
    expect(isValidStage("staff_application", "interview")).toBe(true);
  });

  it("rejects a stage from the wrong type", () => {
    expect(isValidStage("admission_inquiry", "interview")).toBe(false);
    expect(isValidStage("staff_application", "visited")).toBe(false);
  });

  it("rejects an unknown stage", () => {
    expect(isValidStage("admission_inquiry", "banana")).toBe(false);
  });

  it("maps legacy admission stages to the renamed pipeline", () => {
    expect(normalizeStage("toured")).toBe("visited");
    expect(normalizeStage("enrolled")).toBe("admitted");
    expect(normalizeStage("closed")).toBe("lost");
    expect(normalizeStage("contacted")).toBe("contacted"); // unchanged
  });

  it("humanizes stage and type labels", () => {
    // stageMeta is now the only source of stage labels — the timeline text and
    // the pipeline chips must never be able to disagree about a stage's name.
    expect(stageMeta("new").label).toBe("New");
    expect(LEAD_TYPE_LABEL.staff_application).toBe("Staff application");
  });

  it("labels every stage in both pipelines", () => {
    for (const stage of [...PIPELINES.admission_inquiry, ...PIPELINES.staff_application]) {
      expect(stageMeta(stage).label).toBeTruthy();
    }
  });

  it("falls back to a capitalised label for an unknown stage", () => {
    // Covers the case stageLabel() used to handle before it was deleted.
    expect(stageMeta("banana").label).toBe("Banana");
  });
});
