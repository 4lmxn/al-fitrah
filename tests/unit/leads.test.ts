import { describe, it, expect } from "vitest";
import { LEAD_TYPE_LABEL, normalizeStage } from "@/lib/leads";
import { stageStyle, unknownStage, findStage } from "@/lib/stageMeta";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";

describe("legacy stage names", () => {
  it("maps renamed admission stages onto the current pipeline", () => {
    expect(normalizeStage("toured")).toBe("visited");
    expect(normalizeStage("enrolled")).toBe("admitted");
    expect(normalizeStage("closed")).toBe("lost");
    expect(normalizeStage("contacted")).toBe("contacted"); // unchanged
  });

  it("labels the lead types, which are structural rather than configurable", () => {
    // The two TYPES are baked into the data model and the routes. The STAGES
    // within them moved to configuration.
    expect(LEAD_TYPE_LABEL.staff_application).toBe("Staff application");
    expect(LEAD_TYPE_LABEL.admission_inquiry).toBe("Admission inquiry");
  });
});

describe("stage presentation derives from group, not a per-stage table", () => {
  it("styles every configured stage without needing an entry for it", () => {
    // The old map could only style the stages that shipped; a school adding one
    // would have got an unstyled pill.
    for (const p of Object.values(DEFAULT_SETTINGS.pipelines)) {
      for (const s of p.stages) expect(stageStyle(s.group).pill).toBeTruthy();
    }
  });

  it("deepens colour through the middle of the pipeline", () => {
    // First active stage stays faint, later ones medium — the progression the
    // old hardcoded table encoded by hand, now derived from position.
    expect(stageStyle("active", 0)).not.toEqual(stageStyle("active", 1));
    expect(stageStyle("active", 1)).toEqual(stageStyle("active", 2));
  });

  it("distinguishes the four groups", () => {
    const seen = new Set(["new", "active", "won", "lost"].map((g) => stageStyle(g as "new").pill));
    expect(seen.size).toBe(4);
  });

  it("falls back for a stage removed from the pipeline", () => {
    // A lead saved under a stage an admin later deleted must still render.
    expect(unknownStage("bespoke").label).toBe("Bespoke");
    expect(findStage([], "gone").label).toBe("Gone");
  });

  it("finds a configured stage by id", () => {
    const stages = [{ id: "new", label: "New", group: "new" as const, terminal: false, pill: "p", dot: "d" }];
    expect(findStage(stages, "new").label).toBe("New");
  });
});
