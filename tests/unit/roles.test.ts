import { describe, expect, it, afterEach } from "vitest";
import { isAllowed, roleFor, getAllowlist, getOwners } from "@/lib/roles";

function setEnv(allow?: string, owners?: string) {
  if (allow === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = allow;
  if (owners === undefined) delete process.env.ADMIN_OWNERS;
  else process.env.ADMIN_OWNERS = owners;
}

afterEach(() => setEnv(undefined, undefined));

describe("allowlist", () => {
  it("admits a listed address regardless of case or padding", () => {
    setEnv(" Owner@School.com , staff@school.com ");
    expect(isAllowed("owner@school.com")).toBe(true);
    expect(isAllowed("OWNER@SCHOOL.COM")).toBe(true);
    expect(isAllowed("staff@school.com")).toBe(true);
  });

  it("rejects anyone not listed", () => {
    setEnv("owner@school.com");
    expect(isAllowed("attacker@evil.com")).toBe(false);
  });

  it("rejects empty identities rather than matching a blank entry", () => {
    setEnv("owner@school.com,,");
    expect(getAllowlist()).toEqual(["owner@school.com"]);
    expect(isAllowed("")).toBe(false);
    expect(isAllowed(null)).toBe(false);
    expect(isAllowed(undefined)).toBe(false);
  });

  it("admits nobody when unset — a missing allowlist must not mean open", () => {
    setEnv(undefined);
    expect(isAllowed("anyone@anywhere.com")).toBe(false);
  });
});

describe("roles", () => {
  it("marks a listed owner as owner and everyone else as staff", () => {
    setEnv("owner@school.com,staff@school.com", "owner@school.com");
    expect(roleFor("owner@school.com")).toBe("owner");
    expect(roleFor("staff@school.com")).toBe("staff");
  });

  it("is case-insensitive", () => {
    setEnv("owner@school.com", "Owner@School.com");
    expect(roleFor("OWNER@school.com")).toBe("owner");
  });

  it("treats everyone as owner when ADMIN_OWNERS is unset", () => {
    // Deliberate: shipping roles must not silently strip the school's ability
    // to delete anything before someone has set the new variable.
    setEnv("a@school.com,b@school.com", undefined);
    expect(roleFor("a@school.com")).toBe("owner");
    expect(roleFor("b@school.com")).toBe("owner");
  });

  it("treats a blank ADMIN_OWNERS the same as unset", () => {
    setEnv("a@school.com", "   ");
    expect(getOwners()).toEqual([]);
    expect(roleFor("a@school.com")).toBe("owner");
  });

  it("never promotes a missing identity", () => {
    setEnv("a@school.com", "a@school.com");
    expect(roleFor(null)).toBe("staff");
    expect(roleFor(undefined)).toBe("staff");
    expect(roleFor("")).toBe("staff");
  });

  it("does not make an unlisted address an owner just by naming it in ADMIN_OWNERS", () => {
    // roleFor answers "what rank", isAllowed answers "may they in at all".
    // Access is checked first in requireAdmin, so this address never gets a role.
    setEnv("a@school.com", "ghost@evil.com");
    expect(isAllowed("ghost@evil.com")).toBe(false);
  });
});
