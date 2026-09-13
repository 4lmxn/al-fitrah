import { describe, expect, it } from "vitest";
import { indianMobileE164, normalizeIndianPhone, waLink } from "@/lib/phone";

describe("normalizeIndianPhone", () => {
  it("adds 91 to a bare 10-digit number", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("919876543210");
  });

  it("strips formatting before deciding", () => {
    // "98765 43210" is ten digits once spaces go; getting this wrong produces a
    // valid-looking link that opens a chat with the wrong person.
    expect(normalizeIndianPhone("98765 43210")).toBe("919876543210");
    expect(normalizeIndianPhone("(98765) 43210")).toBe("919876543210");
  });

  it("leaves an already-qualified number alone", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("919876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("919876543210");
  });

  it("does not assume India for a non-10-digit foreign number", () => {
    expect(normalizeIndianPhone("+1 415 555 0123")).toBe("14155550123");
  });

  it("drops the trunk zero people write in front of a mobile number", () => {
    // The number stored for a guardian is matched against the verified claim
    // from Firebase, which is always +91… — so an eleven-digit "098765 43210"
    // kept verbatim is a guardian who can never sign in, and nothing says so.
    expect(normalizeIndianPhone("098765 43210")).toBe("919876543210");
    expect(normalizeIndianPhone("0 98765 43210")).toBe("919876543210");
    expect(normalizeIndianPhone("00919876543210")).toBe("919876543210");
  });

  it("returns null when there is nothing to dial", () => {
    expect(normalizeIndianPhone("—")).toBeNull();
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("   ")).toBeNull();
    expect(normalizeIndianPhone("0")).toBeNull();
  });
});

describe("indianMobileE164", () => {
  it("accepts an Indian mobile however it was written", () => {
    expect(indianMobileE164("9876543210")).toBe("+919876543210");
    expect(indianMobileE164("098765 43210")).toBe("+919876543210");
    expect(indianMobileE164("+91 98765 43210")).toBe("+919876543210");
  });

  it("refuses a mistyped number rather than trimming it to fit", () => {
    // The bug this exists to stop: slicing the last ten digits off an
    // eleven-digit typo yields a different, entirely valid number — and the
    // sign-in code goes to whoever owns it.
    expect(indianMobileE164("98765432101")).toBeNull();
    expect(indianMobileE164("98765")).toBeNull();
  });

  it("refuses what is not a mobile", () => {
    // Indian mobile numbers start 6-9; a landline cannot receive the code.
    expect(indianMobileE164("0801234567")).toBeNull();
    expect(indianMobileE164("+1 415 555 0123")).toBeNull();
    expect(indianMobileE164("—")).toBeNull();
  });
});

describe("waLink", () => {
  it("builds a plain link", () => {
    expect(waLink("9876543210")).toBe("https://wa.me/919876543210");
  });

  it("encodes pre-filled text", () => {
    const link = waLink("9876543210", "Hello & welcome?") as string;
    expect(link).toBe("https://wa.me/919876543210?text=Hello%20%26%20welcome%3F");
  });

  it("returns null rather than a link with no recipient", () => {
    // A lead with "—" for a phone must render no button, not wa.me/ .
    expect(waLink("—")).toBeNull();
    expect(waLink("—", "hi")).toBeNull();
  });
});
