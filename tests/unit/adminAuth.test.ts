import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAllowlist, isAllowed } from "@/lib/adminAuth";

describe("admin allowlist", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => { process.env.ADMIN_EMAILS = "Admin@AlFitrah.com,  second@x.com ,"; });
  afterEach(() => { process.env.ADMIN_EMAILS = original; });

  it("parses, trims, lowercases, and drops empties", () => {
    expect(getAllowlist()).toEqual(["admin@alfitrah.com", "second@x.com"]);
  });

  it("matches case-insensitively", () => {
    expect(isAllowed("ADMIN@alfitrah.COM")).toBe(true);
    expect(isAllowed("second@x.com")).toBe(true);
  });

  it("rejects non-members and empty input", () => {
    expect(isAllowed("nobody@x.com")).toBe(false);
    expect(isAllowed("")).toBe(false);
    expect(isAllowed(null)).toBe(false);
    expect(isAllowed(undefined)).toBe(false);
  });

  it("returns an empty allowlist when env is unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAllowlist()).toEqual([]);
    expect(isAllowed("admin@alfitrah.com")).toBe(false);
  });
});
