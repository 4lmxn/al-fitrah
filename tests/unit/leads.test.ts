import { describe, it, expect } from "vitest";
import { PIPELINES, isValidStage, stageLabel, LEAD_TYPE_LABEL } from "@/lib/leads";

describe("lead pipelines", () => {
  it("defines the student pipeline in order", () => {
    expect(PIPELINES.admission_inquiry).toEqual([
      "new", "contacted", "toured", "enrolled", "closed",
    ]);
  });

  it("defines the staff pipeline in order", () => {
    expect(PIPELINES.staff_application).toEqual([
      "new", "reviewing", "interview", "hired", "rejected",
    ]);
  });

  it("accepts a stage valid for the type", () => {
    expect(isValidStage("admission_inquiry", "toured")).toBe(true);
    expect(isValidStage("staff_application", "interview")).toBe(true);
  });

  it("rejects a stage from the wrong type", () => {
    expect(isValidStage("admission_inquiry", "interview")).toBe(false);
    expect(isValidStage("staff_application", "toured")).toBe(false);
  });

  it("rejects an unknown stage", () => {
    expect(isValidStage("admission_inquiry", "banana")).toBe(false);
  });

  it("humanizes stage and type labels", () => {
    expect(stageLabel("new")).toBe("New");
    expect(LEAD_TYPE_LABEL.staff_application).toBe("Staff application");
  });
});
