import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ICON_NAMES } from "@/components/ui/Icon";

// The icon font is subsetted to ICON_NAMES (see layout.tsx). An icon used in a
// page but missing from that list renders as its own ligature name — the word
// "expand_more" sitting in the middle of the layout. This rescans the source
// and fails before a reviewer has to spot that.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Deliberately over-inclusive: every quoted lowercase string inside an <Icon>
// tag, plus icon props and *_ICON lookup maps. Extra names cost nothing (Google
// ignores ones it doesn't recognise); a missed one is a visible bug.
function iconNamesIn(source: string): string[] {
  const found: string[] = [];
  const collect = (pattern: RegExp, from: string) => {
    for (const match of from.matchAll(pattern)) found.push(match[1]);
  };

  for (const tag of source.matchAll(/<Icon\b[^>]*?\/?>/g)) {
    collect(/"([a-z][a-z0-9_]*)"/g, tag[0]);
  }
  collect(/\bicon:\s*"([a-z][a-z0-9_]*)"/g, source);
  collect(/\bicon="([a-z][a-z0-9_]*)"/g, source);
  for (const map of source.matchAll(/const\s+\w*ICON\w*[^=]*=\s*\{([\s\S]*?)\}/g)) {
    collect(/:\s*"([a-z][a-z0-9_]*)"/g, map[1]);
  }
  return found;
}

describe("icon font subset", () => {
  it("covers every icon the source renders", () => {
    const declared = new Set<string>(ICON_NAMES);
    const missing = new Set<string>();

    for (const file of sourceFiles("src")) {
      for (const name of iconNamesIn(readFileSync(file, "utf8"))) {
        if (!declared.has(name)) missing.add(`${name} (${file})`);
      }
    }

    expect([...missing]).toEqual([]);
  });
});
