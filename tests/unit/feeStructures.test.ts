import { describe, expect, it } from "vitest";
import { netTotalPaise } from "@/lib/feeStructures";
import { parseRupees } from "@/lib/money";

describe("netTotalPaise", () => {
  it("subtracts a concession from the fee", () => {
    expect(netTotalPaise(2_500_000, 200_000)).toBe(2_300_000);
  });

  it("leaves the fee untouched when there is no concession", () => {
    expect(netTotalPaise(2_500_000, 0)).toBe(2_500_000);
  });

  it("clamps at zero rather than writing a negative total", () => {
    // A discount larger than the fee is a typo. Writing the negative through
    // would make balance = total − paid read as the school owing the family,
    // and the dues list would quietly stop showing them.
    expect(netTotalPaise(2_500_000, 9_900_000)).toBe(0);
  });

  it("is exact at the paisa, because the inputs are integers", () => {
    // The whole reason money is stored in paise: 25000.10 − 0.05 in floats is
    // not 24999.95, and a ledger that drifts disagrees with the receipt in a
    // parent's hand.
    const fee = parseRupees("25000.10")!;
    const off = parseRupees("0.05")!;
    expect(netTotalPaise(fee, off)).toBe(2_500_005);
  });

  it("rounds a fractional input rather than storing a fraction of a paisa", () => {
    expect(netTotalPaise(100.6, 0.4)).toBe(101);
  });
});
