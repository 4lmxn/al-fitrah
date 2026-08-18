import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * `Section` defaults to `py-12 sm:py-20` — a tight rhythm on phones, a roomy one
 * on desktop.
 *
 * That default lives partly inside a media query, and `cn` is a plain join
 * rather than tailwind-merge, so a caller writing `pt-0` gets it silently
 * overridden by `sm:py-20` from 640px up. The section then renders with a full
 * top pad on every screen that matters and nothing in the diff looks wrong.
 *
 * This is exactly the bug that was shipped once already: interior pages carried
 * ~112px of dead top padding because `pt-0` lost to `sm:py-28`. Rather than
 * trusting everyone to remember, walk the source.
 */

function tsxUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return tsxUnder(full);
    return e.name.endsWith(".tsx") ? [full] : [];
  });
}

const files = tsxUnder("src");

// Any padding utility passed to a <Section className="...">.
// [^]* rather than .* with the `s` flag, which needs a newer compile target.
const SECTION = /<Section\b[^>]*?className="([^"]*)"/g;
const PAD = /\bp([ytb])-([\w.[\]]+)/g;

describe("Section padding overrides", () => {
  it("always pair a padding override with its sm: twin", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const [, classes] of src.matchAll(SECTION)) {
        for (const [token] of classes.matchAll(PAD)) {
          // Only bare (unprefixed) tokens are at risk; a token already inside a
          // breakpoint sits in the same media query as the default.
          const bare = new RegExp(`(^|\\s)${token.replace(/[[\]]/g, "\\$&")}(\\s|$)`).test(classes);
          if (bare && !classes.includes(`sm:${token}`)) {
            offenders.push(`${file}: "${token}" has no "sm:${token}"`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("scans a meaningful number of files, so a broken glob cannot pass silently", () => {
    expect(files.length).toBeGreaterThan(20);
  });
});
