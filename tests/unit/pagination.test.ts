import { describe, expect, it } from "vitest";
import { encodeCursor, decodeCursor, PAGE_SIZE, SEARCH_SCAN_LIMIT, INSIGHTS_SCAN_LIMIT } from "@/lib/leadQueries";
import type { LeadRow } from "@/lib/leadQueries";

const row = (over: Partial<LeadRow> = {}): LeadRow => ({
  id: "abc123",
  type: "admission_inquiry",
  name: "Ayesha Khan",
  phone: "9876543210",
  email: null,
  stage: "new",
  noteCount: 0,
  assignedTo: null,
  possibleDuplicateOf: null,
  tags: [],
  createdAtMs: 1_754_300_000_000,
  followUpMs: null,
  ...over,
});

describe("inbox cursor", () => {
  it("round-trips", () => {
    const encoded = encodeCursor(row())!;
    expect(decodeCursor(encoded)).toEqual({ createdAtMs: 1_754_300_000_000, id: "abc123" });
  });

  it("carries the document id, not just the timestamp", () => {
    // Two leads created in the same millisecond would otherwise make the cursor
    // ambiguous, and startAfter would skip or repeat a row at the page seam.
    const a = decodeCursor(encodeCursor(row({ id: "aaa" }))!);
    const b = decodeCursor(encodeCursor(row({ id: "bbb" }))!);
    expect(a!.createdAtMs).toBe(b!.createdAtMs);
    expect(a!.id).not.toBe(b!.id);
  });

  it("survives an id containing the separator", () => {
    const encoded = encodeCursor(row({ id: "weird.id.with.dots" }))!;
    expect(decodeCursor(encoded)!.id).toBe("weird.id.with.dots");
  });

  it("cannot be built from a lead with no creation time", () => {
    // Better no "next page" link than a cursor that silently resumes from zero.
    expect(encodeCursor(row({ createdAtMs: null }))).toBeNull();
  });

  it("rejects malformed input rather than paging from a garbage offset", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("nodot")).toBeNull();
    expect(decodeCursor(".leadingdot")).toBeNull();
    expect(decodeCursor("notanumber.abc")).toBeNull();
    expect(decodeCursor("123.")).toBeNull();
  });
});

describe("read budget ceilings", () => {
  // These constants are the whole reason the inbox cost is flat in collection
  // size. If one grows without thought, the bill grows with it.
  it("keeps a page small", () => {
    expect(PAGE_SIZE).toBeLessThanOrEqual(50);
  });

  it("bounds the unindexed search scan", () => {
    expect(SEARCH_SCAN_LIMIT).toBeLessThanOrEqual(1000);
  });

  it("bounds the insights attribution scan", () => {
    expect(INSIGHTS_SCAN_LIMIT).toBeLessThanOrEqual(1000);
  });
});
