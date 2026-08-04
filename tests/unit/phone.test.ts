import { describe, expect, it } from "vitest";
import { normalizeIndianPhone, waLink } from "@/lib/phone";

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

  it("returns null when there is nothing to dial", () => {
    expect(normalizeIndianPhone("—")).toBeNull();
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("   ")).toBeNull();
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
