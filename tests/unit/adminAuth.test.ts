import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAllowlist, resolveAllowlist } from "@/lib/roles";

// The env list is the floor: whatever the staff roster in Firestore says, these
// addresses keep access. The roster half is covered in staffAccess.test.ts,
// which is where it can be supplied without reaching a database.
const admits = (email: string | null | undefined) =>
  Boolean(email) && resolveAllowlist(getAllowlist(), []).includes(String(email).toLowerCase());

describe("admin allowlist", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => { process.env.ADMIN_EMAILS = "Admin@AlFitrah.com,  second@x.com ,"; });
  afterEach(() => { process.env.ADMIN_EMAILS = original; });

  it("parses, trims, lowercases, and drops empties", () => {
    expect(getAllowlist()).toEqual(["admin@alfitrah.com", "second@x.com"]);
  });

  it("matches case-insensitively", () => {
    expect(admits("ADMIN@alfitrah.COM")).toBe(true);
    expect(admits("second@x.com")).toBe(true);
  });

  it("rejects non-members and empty input", () => {
    expect(admits("nobody@x.com")).toBe(false);
    expect(admits("")).toBe(false);
    expect(admits(null)).toBe(false);
    expect(admits(undefined)).toBe(false);
  });

  it("returns an empty allowlist when env is unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAllowlist()).toEqual([]);
    expect(admits("admin@alfitrah.com")).toBe(false);
  });
});
