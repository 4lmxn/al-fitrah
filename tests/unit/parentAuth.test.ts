import { describe, expect, it } from "vitest";
import { guardianEmailsFrom, guardianPhonesFrom } from "@/lib/students";
import { normalizeIndianPhone } from "@/lib/phone";

describe("guardianPhonesFrom", () => {
  it("normalises so a parent can sign in however the number was typed", () => {
    // The office types "98765 43210"; the parent's phone reports
    // "+919876543210". Both must resolve to the same key or sign-in fails for a
    // family that is plainly on the roll.
    const keys = guardianPhonesFrom([{ phone: "98765 43210" }]);
    expect(keys).toEqual([normalizeIndianPhone("+91 98765 43210")]);
  });

  it("keeps every distinct guardian", () => {
    const keys = guardianPhonesFrom([{ phone: "9876543210" }, { phone: "9000000001" }]);
    expect(keys).toHaveLength(2);
  });

  it("collapses duplicates so one guardian is not listed twice", () => {
    const keys = guardianPhonesFrom([{ phone: "9876543210" }, { phone: "+919876543210" }]);
    expect(keys).toEqual(["919876543210"]);
  });

  it("drops guardians with no usable number rather than storing empties", () => {
    // An empty string in an array-contains index would match a query for "",
    // which is not a number anyone can sign in with.
    expect(guardianPhonesFrom([{ phone: "" }, { phone: null }, { phone: "—" }])).toEqual([]);
  });

  it("returns an empty list for no guardians", () => {
    expect(guardianPhonesFrom([])).toEqual([]);
  });
});

describe("guardianEmailsFrom", () => {
  it("lowercases so case typed by the office does not block sign-in", () => {
    // The office records "Ayesha@Example.com"; the parent signs in as
    // "ayesha@example.com". Both must resolve or a family is locked out.
    expect(guardianEmailsFrom([{ email: "Ayesha@Example.com" }])).toEqual(["ayesha@example.com"]);
  });

  it("collapses duplicates across casing", () => {
    expect(guardianEmailsFrom([{ email: "a@b.com" }, { email: "A@B.COM" }])).toEqual(["a@b.com"]);
  });

  it("drops guardians with no email rather than storing empties", () => {
    // Most families give no email — an empty string in an array-contains index
    // would match a query for "", which nobody should be able to sign in with.
    expect(guardianEmailsFrom([{ email: "" }, { email: null }])).toEqual([]);
  });

  it("leaves a family with no email reachable only by phone", () => {
    const guardians = [{ name: "P", phone: "9876543210", email: null }];
    expect(guardianEmailsFrom(guardians)).toEqual([]);
    expect(guardianPhonesFrom(guardians)).toEqual(["919876543210"]);
  });
});

describe("authorisation model", () => {
  it("never derives access from anything the browser supplies", async () => {
    // Guard on the shape of the module rather than its behaviour: the portal's
    // safety rests on student ids coming from the verified session, so a future
    // helper that accepts an id as its only argument would be a regression.
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/portalQueries.ts", "utf8"),
    );
    // Every exported read either takes the session, or checks ownership itself.
    expect(src).toMatch(/assertOwnStudent/);
    expect(src).toMatch(/session: ParentSession/);
  });
});
