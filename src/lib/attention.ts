import type { LeadRow } from "@/lib/leadQueries";

export const DEFAULT_TERMINAL_STAGES = new Set(["admitted", "lost", "hired", "rejected"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export function needsAttention(l: LeadRow, now = Date.now(), terminal: Set<string> = DEFAULT_TERMINAL_STAGES): boolean {
  if (terminal.has(l.stage)) return false;
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  if (l.followUpMs != null && l.followUpMs < startToday.getTime()) return true;
  if (l.stage === "new" && l.noteCount === 0 && l.createdAtMs != null && now - l.createdAtMs > 2 * DAY_MS) {
    return true;
  }
  return false;
}
