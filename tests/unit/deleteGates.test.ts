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

/**
 * Every delete a person can click must ask first.
 *
 * These deletes are permanent and several of them take a file with them — a
 * child's birth certificate, a newsletter a parent has the link to. ActionForm
 * has always had a `confirm` prop; for a while exactly one of six deletes
 * passed it, so the other five removed things on a single misclick with no way
 * back.
 *
 * Presence is all this checks. Whether the wording is honest about what is lost
 * is a judgement no test can make.
 */

function tsxUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxUnder(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function openingTag(source: string, from: number): string {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return source.slice(from, i + 1);
  }
  return source.slice(from);
}

describe("destructive forms in the console", () => {
  const files = [...tsxUnder("src/app/admin"), ...tsxUnder("src/components/admin")];

  it("every ActionForm bound to a delete action asks for confirmation", () => {
    const unguarded: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      let at = source.indexOf("<ActionForm");
      while (at !== -1) {
        const tag = openingTag(source, at);
        const action = tag.match(/action=\{(\w+)\}/)?.[1] ?? "";
        if (/^delete/i.test(action) && !tag.includes("confirm=")) {
          const line = source.slice(0, at).split("\n").length;
          unguarded.push(`${file}:${line} — ${action} has no confirm`);
        }
        at = source.indexOf("<ActionForm", at + 1);
      }
    }

    expect(unguarded).toEqual([]);
  });

  it("actually finds the destructive forms", () => {
    const deleteForms = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const found: string[] = [];
      let at = source.indexOf("<ActionForm");
      while (at !== -1) {
        const action = openingTag(source, at).match(/action=\{(\w+)\}/)?.[1] ?? "";
        if (/^delete/i.test(action)) found.push(action);
        at = source.indexOf("<ActionForm", at + 1);
      }
      return found;
    });
    expect(deleteForms.length).toBeGreaterThanOrEqual(6);
  });
});
