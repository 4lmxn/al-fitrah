import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/relativeTime";
import { formatBytes } from "@/lib/bytes";

/**
 * These two replaced thirteen hand-written copies across the site, admin and
 * portal. The copies had drifted: some returned "—" for a missing date and one
 * returned "", and the two size formatters disagreed about files under 1 KB —
 * one reported the real byte count, the other rounded everything up to "1 KB".
 *
 * `datetime` is the reason this test exists at all. The obvious implementation
 * uses toLocaleDateString, which throws TypeError on a timeStyle option rather
 * than ignoring it, so the bug only appears on the one screen that asks for a
 * time.
 */

const ms = Date.UTC(2026, 8, 16, 10, 30);

describe("formatDate", () => {
  it("renders every style without throwing", () => {
    for (const style of ["day", "medium", "long", "full", "datetime"] as const) {
      expect(() => formatDate(ms, style)).not.toThrow();
      expect(formatDate(ms, style)).not.toBe("");
    }
  });

  it("includes a time only for the datetime style", () => {
    expect(formatDate(ms, "datetime")).toMatch(/\d:\d{2}/);
    expect(formatDate(ms, "medium")).not.toMatch(/\d:\d{2}/);
  });

  it("falls back to an em dash, and lets the caller choose otherwise", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(null, "long", "")).toBe("");
  });

  it("treats epoch zero as missing, the way every copy it replaced did", () => {
    expect(formatDate(0)).toBe("—");
  });
});

describe("formatBytes", () => {
  it("reports small files in bytes rather than rounding them up to a kilobyte", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("switches units at each threshold", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 - 1)).toBe("1024 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
