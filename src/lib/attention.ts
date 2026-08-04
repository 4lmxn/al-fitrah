// Pure "needs attention" logic, kept free of server-only imports so both the
// server inbox query (leadQueries) and the client board (InboxBoard) can share
// one definition — no drift between the count the server seeds and the deltas
// the client applies optimistically.
import type { LeadRow } from "@/lib/leadQueries";

export const TERMINAL_STAGES = new Set(["admitted", "lost", "hired", "rejected"]);
const DAY_MS = 24 * 60 * 60 * 1000;

// A lead "needs attention" if its follow-up is overdue, or it's still new and
// untouched (no notes) more than 48h after arriving. Terminal stages never do.
export function needsAttention(l: LeadRow, now = Date.now()): boolean {
  if (TERMINAL_STAGES.has(l.stage)) return false;
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  if (l.followUpMs != null && l.followUpMs < startToday.getTime()) return true;
  if (l.stage === "new" && l.noteCount === 0 && l.createdAtMs != null && now - l.createdAtMs > 2 * DAY_MS) {
    return true;
  }
  return false;
}
