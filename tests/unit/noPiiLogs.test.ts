import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Staff emails, parent phone numbers and record ids belong in the audit log,
// which is queryable and expires (lib/audit.ts), not in Cloud Logging, where
// they sit in a retention policy nobody set and cannot be answered against.
// This rescans the source so the pattern cannot quietly come back one action
// at a time — the way it accumulated the first time.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// console.error is deliberately not covered: an error needs its identifiers to
// be diagnosable, and it fires on a path that is already broken.
const CONSOLE_LOG = /console\.log\(([\s\S]*?)\);/g;

// What a log line must never carry. Ids are allowed — they name a record
// without naming a person, and an operational count is the reason to log.
const IDENTIFYING = /\b(admin\.email|\.email|phone|guardianName|parentName|childName|fullName)\b/;

describe("logs carry no personal data", () => {
  it("keeps staff and family identifiers out of console.log", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles("src")) {
      for (const [, args] of readFileSync(file, "utf8").matchAll(CONSOLE_LOG)) {
        if (IDENTIFYING.test(args)) offenders.push(`${file}: ${args.trim().slice(0, 80)}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
