import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every admin delete action must check the role itself.
 *
 * Hiding a delete button from a staff account is presentation, not
 * authorisation. A server action is a POST endpoint: anyone who can reach the
 * console can invoke one directly, whether or not a button for it was rendered
 * to them. `deleteStudentDocumentAction` was gated only in the UI for a while —
 * `canDelete={admin.role === "owner"}` on the component, nothing in the action —
 * which meant any staff account could delete a child's medical note or birth
 * certificate by posting to it.
 *
 * Its five siblings all had the guard. That is the failure mode this catches:
 * not a missing convention, but one file quietly left out of one.
 */

function actionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return actionFiles(path);
    return entry.name === "actions.ts" ? [path] : [];
  });
}

const DELETE_ACTION = /export async function (delete\w+)/g;

function bodyAfter(source: string, index: number): string {
  const next = source.indexOf("\nexport ", index + 1);
  return source.slice(index, next === -1 ? source.length : next);
}

describe("admin delete actions", () => {
  const files = actionFiles("src/app/admin");

  it("every one refuses a non-owner in the action, not only in the UI", () => {
    const ungated: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(DELETE_ACTION)) {
        const body = bodyAfter(source, match.index);
        const guarded = /role !== "owner"/.test(body) || /requireOwner\(/.test(body);
        if (!guarded) ungated.push(`${file} — ${match[1]}() does not check for owner`);
      }
    }

    expect(ungated).toEqual([]);
  });

  it("actually finds the delete actions, so a broken path cannot pass silently", () => {
    const found = files.flatMap((file) => [...readFileSync(file, "utf8").matchAll(DELETE_ACTION)]);
    expect(found.length).toBeGreaterThanOrEqual(6);
  });
});
