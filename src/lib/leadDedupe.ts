import { normalizeIndianPhone } from "@/lib/phone";

/**
 * Duplicate detection for leads.
 *
 * A school gets the same parent twice constantly: they fill the website form,
 * then walk in a week later and the receptionist logs them again. Today that is
 * two records, two people calling, and a funnel that double-counts.
 *
 * The rule that shapes everything here: NEVER silently drop or merge an
 * enquiry. A second enquiry from the same number is often legitimate — a second
 * child, a year later, a different program. Losing one to tidy the list is far
 * worse than showing two linked records and letting a human decide.
 *
 * So a suspected duplicate is created, LINKED, and surfaced. Never discarded.
 */

/**
 * Stable key for matching. Phone is the only field parents reliably repeat —
 * names get shortened, spelled differently, or entered as the child's.
 */
export function phoneKey(phone: string): string | null {
  return normalizeIndianPhone(phone);
}

export type DuplicateVerdict =
  | { duplicate: false }
  | { duplicate: true; ofId: string; ofName: string; daysApart: number };

/** How long a prior enquiry stays "recent" enough to flag. */
export const DUPLICATE_WINDOW_DAYS = 180;

/**
 * Decide whether a new enquiry looks like one we already have.
 *
 * Bounded by a window: the same family enquiring two years later for a younger
 * sibling is a new enquiry, not a duplicate, and flagging it would train staff
 * to dismiss the warning.
 */
export function judge(
  existing: { id: string; name: string; createdAtMs: number | null } | null,
  nowMs = Date.now(),
): DuplicateVerdict {
  if (!existing) return { duplicate: false };
  const created = existing.createdAtMs ?? nowMs;
  const daysApart = Math.floor((nowMs - created) / (24 * 60 * 60 * 1000));
  if (daysApart > DUPLICATE_WINDOW_DAYS) return { duplicate: false };
  return { duplicate: true, ofId: existing.id, ofName: existing.name, daysApart };
}
