import { describe, expect, it } from "vitest";
import { resolveAllowlist, resolveRole, type RosterEntry } from "@/lib/roles";
import { rosterFrom, type StaffMember } from "@/lib/staff";

const member = (over: Partial<StaffMember> = {}): StaffMember => ({
  id: "s1",
  name: "Ayesha Khan",
  email: "ayesha@school.com",
  phone: "9876543210",
  designation: "Class teacher",
  role: "staff",
  access: true,
  status: "active",
  joinedAtMs: null,
  note: null,
  ...over,
});

const roster = (...entries: RosterEntry[]) => entries;

describe("who may sign in", () => {
  it("admits the configured addresses and the staff list together", () => {
    const list = resolveAllowlist(["owner@school.com"], roster({ email: "ayesha@school.com", role: "staff" }));
    expect(list).toEqual(["ayesha@school.com", "owner@school.com"]);
  });

  it("keeps the configured address even when the staff list is empty", () => {
    // The way back in. A staff list that is wrong, or a roster write that
    // failed, must never be able to lock the school out of its own console.
    expect(resolveAllowlist(["owner@school.com"], [])).toEqual(["owner@school.com"]);
  });

  it("does not admit anyone when both are empty", () => {
    expect(resolveAllowlist([], [])).toEqual([]);
  });

  it("counts one address once, however it was spelled", () => {
    const list = resolveAllowlist(["Owner@School.com".toLowerCase()], roster({ email: "OWNER@SCHOOL.COM", role: "owner" }));
    expect(list).toEqual(["owner@school.com"]);
  });
});

describe("who is an owner", () => {
  it("treats everyone as owner while no owner exists anywhere", () => {
    // Deliberate: introducing roles must not lock the school out on the day it
    // ships. The moment one owner exists, the split starts applying.
    expect(resolveRole("anyone@school.com", [], [])).toBe("owner");
  });

  it("stops being permissive as soon as the staff list names an owner", () => {
    const r = roster({ email: "principal@school.com", role: "owner" });
    expect(resolveRole("principal@school.com", [], r)).toBe("owner");
    expect(resolveRole("teacher@school.com", [], r)).toBe("staff");
  });

  it("honours a configured owner even if the staff list disagrees", () => {
    const r = roster({ email: "teacher@school.com", role: "staff" });
    expect(resolveRole("owner@school.com", ["owner@school.com"], r)).toBe("owner");
    expect(resolveRole("teacher@school.com", ["owner@school.com"], r)).toBe("staff");
  });

  it("gives no role to a missing address", () => {
    expect(resolveRole(null, ["owner@school.com"], [])).toBe("staff");
  });
});

describe("what reaches the roster", () => {
  it("carries only people who can actually sign in", () => {
    expect(
      rosterFrom([
        member({ id: "a", email: "in@school.com" }),
        member({ id: "b", email: "no-access@school.com", access: false }),
        member({ id: "c", email: "inactive@school.com", status: "inactive" }),
        member({ id: "d", email: null }),
      ]),
    ).toEqual([{ email: "in@school.com", role: "staff" }]);
  });

  it("an inactive owner grants nothing", () => {
    // Otherwise marking someone inactive would look like removing their access
    // in the list while leaving them able to delete records.
    expect(rosterFrom([member({ role: "owner", status: "inactive" })])).toEqual([]);
  });

  it("lower-cases the address it will be matched on", () => {
    expect(rosterFrom([member({ email: "Ayesha@School.com" })])).toEqual([
      { email: "ayesha@school.com", role: "staff" },
    ]);
  });
});
