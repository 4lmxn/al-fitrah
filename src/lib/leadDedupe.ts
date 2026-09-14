import { normalizeIndianPhone } from "@/lib/phone";

export function phoneKey(phone: string): string | null {
  return normalizeIndianPhone(phone);
}

export type DuplicateVerdict =
  | { duplicate: false }
  | { duplicate: true; ofId: string; ofName: string; daysApart: number };

export const DUPLICATE_WINDOW_DAYS = 180;

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
