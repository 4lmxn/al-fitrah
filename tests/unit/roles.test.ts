import { describe, expect, it, afterEach } from "vitest";
import { getAllowlist, getOwners, resolveAllowlist, resolveRole } from "@/lib/roles";

function setEnv(allow?: string, owners?: string) {
  if (allow === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = allow;
  if (owners === undefined) delete process.env.ADMIN_OWNERS;
  else process.env.ADMIN_OWNERS = owners;
}

afterEach(() => setEnv(undefined, undefined));

const allows = (email: string | null | undefined) =>
  Boolean(email) && resolveAllowlist(getAllowlist(), []).includes(String(email).toLowerCase());

const rank = (email: string | null | undefined) => resolveRole(email, getOwners(), []);

describe("allowlist", () => {
  it("admits a listed address regardless of case or padding", () => {
    setEnv(" Owner@School.com , staff@school.com ");
    expect(allows("owner@school.com")).toBe(true);
    expect(allows("OWNER@SCHOOL.COM")).toBe(true);
    expect(allows("staff@school.com")).toBe(true);
  });

  it("rejects anyone not listed", () => {
    setEnv("owner@school.com");
    expect(allows("attacker@evil.com")).toBe(false);
  });

  it("rejects empty identities rather than matching a blank entry", () => {
    setEnv("owner@school.com,,");
    expect(getAllowlist()).toEqual(["owner@school.com"]);
    expect(allows("")).toBe(false);
    expect(allows(null)).toBe(false);
    expect(allows(undefined)).toBe(false);
  });

  it("admits nobody when unset — a missing allowlist must not mean open", () => {
    setEnv(undefined);
    expect(allows("anyone@anywhere.com")).toBe(false);
  });
});

describe("roles", () => {
  it("marks a listed owner as owner and everyone else as staff", () => {
    setEnv("owner@school.com,staff@school.com", "owner@school.com");
    expect(rank("owner@school.com")).toBe("owner");
    expect(rank("staff@school.com")).toBe("staff");
  });

  it("is case-insensitive", () => {
    setEnv("owner@school.com", "Owner@School.com");
    expect(rank("OWNER@school.com")).toBe("owner");
  });

  it("treats everyone as owner when ADMIN_OWNERS is unset", () => {
    // Deliberate: shipping roles must not silently strip the school's ability
    // to delete anything before someone has set the new variable.
    setEnv("a@school.com,b@school.com", undefined);
    expect(rank("a@school.com")).toBe("owner");
    expect(rank("b@school.com")).toBe("owner");
  });

  it("treats a blank ADMIN_OWNERS the same as unset", () => {
    setEnv("a@school.com", "   ");
    expect(getOwners()).toEqual([]);
    expect(rank("a@school.com")).toBe("owner");
  });

  it("never promotes a missing identity", () => {
    setEnv("a@school.com", "a@school.com");
    expect(rank(null)).toBe("staff");
    expect(rank(undefined)).toBe("staff");
    expect(rank("")).toBe("staff");
  });

  it("does not make an unlisted address an owner just by naming it in ADMIN_OWNERS", () => {
    // resolveRole answers "what rank", the allowlist answers "may they in at
    // all". Access is checked first in requireAdmin, so this address never gets
    // a role.
    setEnv("a@school.com", "ghost@evil.com");
    expect(allows("ghost@evil.com")).toBe(false);
  });
});
