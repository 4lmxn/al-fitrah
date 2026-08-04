import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Guards the cost invariants in docs/IMPLEMENTATION_PLAN.md §1.3 that are
// properties of the *code shape* rather than of a pure function, so a unit test
// can't reach them without a Firestore harness. Cheap enough to be worth it:
// each one, if broken, silently multiplies the Firestore bill rather than
// failing anything a normal test would notice.

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

// These invariants are all explained in prose right next to the code that
// upholds them, so a naive scan matches the comment describing the hazard as
// readily as the hazard itself. Strip comments first and check only real code.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const files = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1),
  text: stripComments(readFileSync(path, "utf8")),
}));

describe("cost invariant: never write a placeholder null into an indexed field", () => {
  // Firestore orders null before timestamps, and a null IS indexed. A lead
  // written with `followUpDate: null` therefore satisfies `followUpDate <= today`
  // and is swept into the daily digest's range query — which is what made that
  // query read the entire collection. Absent fields are not indexed; nulls are.
  it("no source file writes followUpDate: null", () => {
    const offenders = files
      .filter((f) => /followUpDate:\s*null/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe("cost invariant: unbounded growth lives in subcollections, not documents", () => {
  // Appending to an array on the lead document rewrites the whole document on
  // every note and walks it toward Firestore's 1 MiB ceiling, past which the
  // lead rejects every further write — including stage changes, which append to
  // the same array. It also forces list views to transfer every lead's entire
  // note history just to read `notes.length`.
  it("nothing appends to a notes array", () => {
    const offenders = files
      .filter((f) => /notes:\s*FieldValue\.arrayUnion/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe("cost invariant: the follow-up digest query is bounded at both ends", () => {
  const cron = files.find((f) => f.path.endsWith(join("api", "cron", "followups", "route.ts")));

  it("the cron route exists", () => {
    expect(cron).toBeDefined();
  });

  it("has a lower bound, without which legacy nulls match and the scan is unbounded", () => {
    expect(cron!.text).toMatch(/\.where\(\s*["']followUpDate["']\s*,\s*["']>=["']/);
  });

  it("still has its upper bound", () => {
    expect(cron!.text).toMatch(/\.where\(\s*["']followUpDate["']\s*,\s*["']<=["']/);
  });
});

describe("cost invariant: public pages do not read Firestore per request", () => {
  // force-dynamic on a public page means one Firestore read per visitor. A
  // shared campaign link can then burn the daily read budget on content that
  // hasn't changed. Admin pages are exempt: they are behind auth, low traffic,
  // and must never serve a stale pipeline.
  it("no page under (site) is force-dynamic", () => {
    const offenders = files
      .filter((f) => f.path.includes("(site)") && /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
