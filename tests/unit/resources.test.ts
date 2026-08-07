import { describe, expect, it } from "vitest";
import { AUDIENCES, canDownload, isAudience, isHidden, type Audience } from "@/lib/resources";
import { resourceStoragePath, validateResourceFile } from "@/lib/storage";

const file = (audience: Audience[], scanStatus: "clean" | "pending" | "infected" = "clean") => ({
  audience,
  scanStatus,
});

describe("canDownload", () => {
  it("gives an anonymous visitor only what is public", () => {
    expect(canDownload(file(["public"]), "public")).toBe(true);
    expect(canDownload(file(["parents"]), "public")).toBe(false);
    expect(canDownload(file(["staff"]), "public")).toBe(false);
  });

  it("gives a parent what is theirs and what is public, and nothing else", () => {
    expect(canDownload(file(["parents"]), "parent")).toBe(true);
    expect(canDownload(file(["public"]), "parent")).toBe(true);
    // The one that matters: a staff-only file must not become readable just
    // because the viewer has signed in as somebody.
    expect(canDownload(file(["staff"]), "parent")).toBe(false);
  });

  it("gives staff everything — they are the people who uploaded it", () => {
    expect(canDownload(file(["staff"]), "staff")).toBe(true);
    expect(canDownload(file([]), "staff")).toBe(true);
  });

  it("shares a file with nobody when no audience is ticked", () => {
    for (const viewer of ["public", "parent"] as const) {
      expect(canDownload(file([]), viewer)).toBe(false);
    }
  });

  it("refuses an unscanned or infected file to everyone, staff included", () => {
    // A scanner that only protects parents protects nobody: the admin console
    // is where an infected upload would be opened first.
    expect(canDownload(file(["public"], "pending"), "public")).toBe(false);
    expect(canDownload(file(["parents"], "pending"), "parent")).toBe(false);
    expect(canDownload(file(["staff"], "infected"), "staff")).toBe(false);
  });
});

describe("isAudience", () => {
  it("accepts only the audiences that resolve to a real session", () => {
    for (const a of AUDIENCES) expect(isAudience(a)).toBe(true);
    // Submitted by a form that a browser can edit. An unknown value stored here
    // would look shared in the console and be visible to no one.
    expect(isAudience("teachers")).toBe(false);
    expect(isAudience("students")).toBe(false);
    expect(isAudience("")).toBe(false);
    expect(isAudience(null)).toBe(false);
  });
});

describe("isHidden", () => {
  it("treats an empty audience as hidden, without a second flag for it", () => {
    expect(isHidden({ audience: [] } as never)).toBe(true);
    expect(isHidden({ audience: ["public"] } as never)).toBe(false);
  });
});

describe("resourceStoragePath", () => {
  // The prefix IS the permission: content/ is world-readable by the storage
  // rules and everything else is closed. If this ever put a private file under
  // content/, the file would be public regardless of what the document says.
  it("puts public files where the rules allow a public read", () => {
    expect(resourceStoragePath("abc", "Newsletter.pdf", true)).toBe("content/resources/abc/Newsletter.pdf");
  });

  it("puts everything else where the rules deny every client", () => {
    expect(resourceStoragePath("abc", "Newsletter.pdf", false)).toBe("resources/abc/Newsletter.pdf");
  });

  it("sanitises the filename, so an upload cannot escape its prefix", () => {
    const path = resourceStoragePath("abc", "../../secret list.pdf", false);
    expect(path).toBe("resources/abc/secret_list.pdf");
    expect(path).not.toContain("..");
  });
});

describe("validateResourceFile", () => {
  it("refuses documents a browser would execute", () => {
    // Not an oversight in the allowlist — HTML and SVG are the two upload types
    // that turn a shared file into a page that runs script.
    expect(validateResourceFile({ type: "text/html", size: 100 }).ok).toBe(false);
    expect(validateResourceFile({ type: "image/svg+xml", size: 100 }).ok).toBe(false);
  });

  it("accepts what a school actually shares", () => {
    expect(validateResourceFile({ type: "application/pdf", size: 100 }).ok).toBe(true);
    expect(validateResourceFile({ type: "image/jpeg", size: 100 }).ok).toBe(true);
  });

  it("refuses an empty file and one over the cap", () => {
    expect(validateResourceFile({ type: "application/pdf", size: 0 }).ok).toBe(false);
    expect(validateResourceFile({ type: "application/pdf", size: 21 * 1024 * 1024 }).ok).toBe(false);
  });
});
