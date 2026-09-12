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

describe("cost invariant: no unbounded fetch of the leads collection", () => {
  const queries = files.find((f) => f.path.endsWith(join("lib", "leadQueries.ts")))!;

  it("the fetch-everything helper is gone", () => {
    // listLeads() fetched every lead of a type with no limit, on every admin
    // page load. Reintroducing it makes the dashboard's read count linear in
    // collection size again — the single most expensive thing this codebase did.
    expect(queries.text).not.toMatch(/export\s+(async\s+)?function\s+listLeads/);
  });

  it("every leads query is bounded, counted, or a single document", () => {
    // Each `.get()` in the data layer must be reachable only via .limit(),
    // .count(), or .doc() — never a bare collection read.
    const bare = queries.text
      .split(/\n\s*\n/)
      .filter((block) => /\.get\(\)/.test(block))
      .filter((block) => !/\.limit\(|\.count\(\)|\.doc\(/.test(block));
    expect(bare).toEqual([]);
  });
});

describe("cost invariant: the pipeline board is bounded per column", () => {
  const queries = files.find((f) => f.path.endsWith(join("lib", "leadQueries.ts")))!;

  // A board invites "just show every card in every column", which is the same
  // linear-in-collection-size read the paged list exists to avoid — six times
  // over. Columns show a bounded slice and take their header number from an
  // aggregation, so the count stays exact while the reads stay flat.
  it("declares a column size", () => {
    expect(queries.text).toMatch(/export const BOARD_COLUMN_SIZE\s*=\s*\d+/);
  });

  it("keeps that size small enough to be a slice, not a fetch-all", () => {
    const size = Number(queries.text.match(/BOARD_COLUMN_SIZE\s*=\s*(\d+)/)![1]);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(25);
  });

  it("applies the limit to the column query", () => {
    expect(queries.text).toMatch(/\.limit\(BOARD_COLUMN_SIZE\)/);
  });

  it("takes the column total from a count, not from the rows it fetched", () => {
    // rows.length would silently cap every column header at the slice size.
    expect(queries.text).toMatch(/total:\s*agg\.data\(\)\.count/);
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

describe("privacy invariant: children's files never reach a shared cache", () => {
  // The photo route is authenticated, but a Cache-Control of "public" would let
  // Cloudflare — or any proxy between the school and the origin — keep a copy
  // of a child's face and hand it to whoever asks next. The session check would
  // never run again. `private` is the whole defence, and it is one word.
  const photo = files.find((f) =>
    f.path.endsWith(join("students", "[id]", "photo", "route.ts")),
  );

  it("the photo route exists", () => {
    expect(photo).toBeDefined();
  });

  it("is marked private, never public", () => {
    expect(photo!.text).toMatch(/Cache-Control["']?\s*:\s*["'][^"']*private/);
    expect(photo!.text).not.toMatch(/Cache-Control["']?\s*:\s*["'][^"']*public/);
  });

  it("requires an admin before reading anything", () => {
    expect(photo!.text).toMatch(/requireAdmin\(\)/);
  });

  it("serves a stream, not a signed URL", () => {
    // A signed URL is a bearer token: it survives in history and needs no
    // session. Same reasoning as the CV route.
    expect(photo!.text).toMatch(/streamObject\(/);
    expect(photo!.text).not.toMatch(/getSignedUrl/);
  });
});

describe("money invariant: the fee ledger is append-only", () => {
  // A mutable "amount paid" field loses money silently: two staff recording
  // payments at once both read 5000, both write 7000, and one parent's ₹2,000
  // vanishes with no error and no trace. It is the only bug class here that
  // cannot be reconstructed afterwards, because the evidence is what got
  // overwritten. Corrections are new negative rows, never edits.
  const feeCode = files.filter((f) => /\bPAYMENTS\b/.test(f.text));

  it("has fee code to check", () => {
    expect(feeCode.length).toBeGreaterThan(0);
  });

  it("never updates or deletes a payment row", () => {
    const offenders = feeCode
      .filter((f) => /collection\(PAYMENTS\)[\s\S]{0,120}?\.(update|delete)\(/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("adjusts the cached paid total with increment, never a read-modify-write", () => {
    const actions = files.find((f) => f.path.endsWith(join("students", "fees-actions.ts")))!;
    expect(actions.text).toMatch(/fees\.paidPaise["']?\s*:\s*FieldValue\.increment/);
  });
});

describe("consistency invariant: one implementation per rule", () => {
  // These were each written out two or three times. The failure mode is silent:
  // fix one copy and the others keep the bug, and a wrong country-code prefix
  // still produces a valid-looking wa.me link — to the wrong person.
  it("only lib/phone decides what a dialable number looks like", () => {
    const offenders = files
      .filter((f) => !f.path.endsWith(join("lib", "phone.ts")))
      .filter((f) => /length === 10/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("only lib/stageMeta names a stage", () => {
    // Two label sources meant the activity timeline and the pipeline chips
    // could disagree about what a stage is called.
    const offenders = files.filter((f) => /export function stageLabel/.test(f.text)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});

describe("compliance invariant: analytics never loads without consent", () => {
  // DPDP 2023 bars behavioural tracking directed at children, and this site
  // collects a child's name and date of birth. The measurement scripts must
  // stay behind an explicit opt-in — a regression here is a legal problem, not
  // a performance one, and nothing else in the suite would notice it.
  const analytics = files.find((f) => f.path.endsWith(join("components", "Analytics.tsx")))!;

  it("reads a consent decision before rendering anything", () => {
    expect(analytics.text).toMatch(/useSyncExternalStore|consent/i);
  });

  it("returns early when consent is absent or refused", () => {
    expect(analytics.text).toMatch(/consent === "undecided"/);
    expect(analytics.text).toMatch(/consent === "denied"\)\s*return null/);
  });

  it("disables ad personalisation and Google signals on the tag", () => {
    expect(analytics.text).toMatch(/allow_google_signals:\s*false/);
    expect(analytics.text).toMatch(/allow_ad_personalization_signals:\s*false/);
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
