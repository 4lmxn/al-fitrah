/**
 * Money, stored as integer paise.
 *
 * Never floats. `0.1 + 0.2 !== 0.3` in IEEE 754, and a fee ledger that drifts by
 * a paisa per transaction is one that eventually disagrees with the receipts the
 * school handed a parent. Firestore has no decimal type, so the storage unit is
 * the smallest indivisible one and formatting happens at the edge.
 */

/** Parse a rupee amount typed by a human into integer paise. */
export function parseRupees(input: string): number | null {
  const trimmed = input.trim().replace(/[₹,\s]/g, "");
  if (!trimmed) return null;
  // Reject anything that isn't a plain amount, rather than letting Number()
  // quietly accept "1e5" or "0x10" as a fee.
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Format paise as rupees for display, e.g. 150050 -> "₹1,500.50". */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}₹${rupees.toLocaleString("en-IN")}.${frac}`;
}
