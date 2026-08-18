import { describe, expect, it } from "vitest";
import { parseRupees, formatPaise } from "@/lib/money";
import { nextReceiptNumber, feesOf } from "@/lib/fees";

describe("parseRupees", () => {
  it("converts whole rupees to paise", () => {
    expect(parseRupees("25000")).toBe(2_500_000);
  });

  it("keeps two decimal places exactly", () => {
    // The reason money is stored as integers at all: 1500.50 in floating point
    // is 1500.4999999999998, and a ledger that drifts a paisa per row
    // eventually disagrees with the receipts a parent is holding.
    expect(parseRupees("1500.50")).toBe(150_050);
    expect(parseRupees("0.01")).toBe(1);
    expect(parseRupees("0.1")).toBe(10);
  });

  it("tolerates the way people actually type amounts", () => {
    expect(parseRupees(" ₹25,000 ")).toBe(2_500_000);
    expect(parseRupees("25,000.75")).toBe(2_500_075);
  });

  it("rejects anything that isn't a plain amount", () => {
    // Number() would happily accept these; a fee of 1e5 or 0x10 is a bug, not
    // an amount, and silently accepting it writes the wrong number to a ledger.
    expect(parseRupees("1e5")).toBeNull();
    expect(parseRupees("0x10")).toBeNull();
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("")).toBeNull();
    expect(parseRupees("-500")).toBeNull();
    expect(parseRupees("1.234")).toBeNull(); // more precision than paise exist
  });

  it("returns zero for an explicit zero, not null", () => {
    // The caller decides whether zero is meaningful; parsing must not conflate
    // "they typed 0" with "that isn't a number".
    expect(parseRupees("0")).toBe(0);
  });
});

describe("formatPaise", () => {
  it("renders rupees with two decimals", () => {
    expect(formatPaise(150_050)).toBe("₹1,500.50");
    expect(formatPaise(2_500_000)).toBe("₹25,000.00");
  });

  it("pads the paise", () => {
    expect(formatPaise(1)).toBe("₹0.01");
    expect(formatPaise(10)).toBe("₹0.10");
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("groups in the Indian system", () => {
    // 10,00,000 not 1,000,000 — a receipt that reads wrong to the reader is
    // wrong, however correct the number is.
    expect(formatPaise(100_000_000)).toBe("₹10,00,000.00");
  });

  it("handles negatives, which is how corrections are recorded", () => {
    expect(formatPaise(-150_050)).toBe("-₹1,500.50");
  });

  it("round-trips with parseRupees", () => {
    for (const input of ["0", "1", "0.01", "1500.50", "25000", "99999.99"]) {
      const paise = parseRupees(input)!;
      expect(parseRupees(formatPaise(paise).replace("₹", ""))).toBe(paise);
    }
  });
});

describe("feesOf", () => {
  it("derives the balance", () => {
    expect(feesOf({ fees: { totalPaise: 2_500_000, paidPaise: 1_000_000 } })).toMatchObject({
      totalPaise: 2_500_000,
      paidPaise: 1_000_000,
      balancePaise: 1_500_000,
    });
  });

  it("treats a missing fee record as zeros, not NaN", () => {
    const empty = {
      totalPaise: 0,
      paidPaise: 0,
      balancePaise: 0,
      // Collection dates must come back null rather than undefined: the buckets
      // in lib/feeStatus branch on `=== null`, and an undefined would classify a
      // family with no schedule as though a date had been read and found absent.
      dueDateMs: null,
      promisedDateMs: null,
      promiseNote: null,
      lastRemindedMs: null,
    };
    expect(feesOf(undefined)).toEqual(empty);
    expect(feesOf({})).toEqual(empty);
  });

  it("reads collection dates off Firestore timestamps", () => {
    const ts = (ms: number) => ({ toMillis: () => ms });
    expect(
      feesOf({ fees: { totalPaise: 100, paidPaise: 0, dueDate: ts(1_700_000_000_000), promiseNote: "after salary" } }),
    ).toMatchObject({ dueDateMs: 1_700_000_000_000, promisedDateMs: null, promiseNote: "after salary" });
  });

  it("reports an overpayment as a negative balance", () => {
    expect(feesOf({ fees: { totalPaise: 1000, paidPaise: 1500 } }).balancePaise).toBe(-500);
  });
});

describe("nextReceiptNumber", () => {
  it("starts at 0001 for a fresh year", () => {
    expect(nextReceiptNumber(2026, null)).toBe("RCP-2026-0001");
  });

  it("increments the highest issued", () => {
    expect(nextReceiptNumber(2026, "RCP-2026-0041")).toBe("RCP-2026-0042");
  });

  it("zero-pads so string ordering matches numeric ordering", () => {
    // The allocation query orders by this field descending to find the highest.
    expect([nextReceiptNumber(2026, "RCP-2026-0009"), "RCP-2026-0009"].sort()).toEqual([
      "RCP-2026-0009",
      "RCP-2026-0010",
    ]);
  });

  it("falls back to 0001 on an unparseable stored number", () => {
    expect(nextReceiptNumber(2026, "RCP-2026-oops")).toBe("RCP-2026-0001");
  });
});
