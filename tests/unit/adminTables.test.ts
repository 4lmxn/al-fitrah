import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Admin tables must be able to scroll inside their own card.
 *
 * The console is built and reviewed on a laptop, but the office reaches for it
 * on a phone — a parent is at the desk, the fee balance is needed now. A table
 * of five columns has no way to fit 390px, and an unwrapped one does not clip
 * or scroll politely: it widens the whole document, so every other section on
 * the page starts drifting sideways too. One overflowing table breaks the page.
 *
 * Dropping columns at small sizes is a good idea and several of these do it,
 * but it is not a substitute — a long receipt number or a guardian's full name
 * can still push a two-column table past the viewport. The overflow container
 * is the guarantee; hiding columns is the polish on top.
 */

function tsxUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return tsxUnder(full);
    return e.name.endsWith(".tsx") ? [full] : [];
  });
}

const files = [...tsxUnder("src/app/admin"), ...tsxUnder("src/components/admin")];

describe("admin tables on a phone", () => {
  it("every table sits inside an overflow container", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("<table")) continue;

      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (!line.includes("<table")) return;
        // The wrapper is expected to open just above the table.
        const above = lines.slice(Math.max(0, i - 4), i).join("\n");
        if (!/overflow-(x-)?auto/.test(above)) {
          offenders.push(`${file}:${i + 1} <table> has no overflow container above it`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("actually finds the admin tables, so a broken path cannot pass silently", () => {
    const withTables = files.filter((f) => readFileSync(f, "utf8").includes("<table"));
    expect(withTables.length).toBeGreaterThanOrEqual(6);
  });
});
