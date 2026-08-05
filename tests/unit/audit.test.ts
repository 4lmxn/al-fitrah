import { describe, expect, it } from "vitest";
import { decodeCursor, RETENTION_DAYS, PAGE_SIZE } from "@/lib/audit";

describe("audit cursor", () => {
  it("round-trips a timestamp and id", () => {
    expect(decodeCursor("1754300000000.abc123")).toEqual({ atMs: 1754300000000, id: "abc123" });
  });

  it("carries the document id, not just the timestamp", () => {
    // Two entries written in the same millisecond — a stage change and its
    // payment, say — would otherwise be skipped or repeated at the page seam.
    const a = decodeCursor("1754300000000.aaa")!;
    const b = decodeCursor("1754300000000.bbb")!;
    expect(a.atMs).toBe(b.atMs);
    expect(a.id).not.toBe(b.id);
  });

  it("survives an id containing the separator", () => {
    expect(decodeCursor("1754300000000.weird.id")!.id).toBe("weird.id");
  });

  it("rejects malformed input rather than paging from a garbage offset", () => {
    for (const bad of [undefined, "", "nodot", ".leading", "notanumber.abc", "123."]) {
      expect(decodeCursor(bad)).toBeNull();
    }
  });
});

describe("audit retention and bounds", () => {
  it("keeps entries long enough to be useful for compliance", () => {
    expect(RETENTION_DAYS).toBeGreaterThanOrEqual(365);
  });

  it("bounds a page so the log cannot become an unbounded read", () => {
    expect(PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});
