import { waLink } from "@/lib/phone";
import { formatPaise } from "@/lib/money";

/**
 * Which families to chase, and in what order.
 *
 * A balance on its own cannot tell you that. "₹18,000 outstanding" is the same
 * number whether the fee falls due next month, fell due in June, or fell due in
 * June and the parent promised on the phone to clear it a fortnight ago. Those
 * are three completely different conversations, and only the third one is
 * urgent.
 *
 * Without that split the only thing an office can do is message everyone who
 * owes anything on the same day of the month — which is precisely why parents
 * stop reading school fee reminders. This module exists so the console can ask
 * for the twelve families actually worth a phone call this morning.
 *
 * Pure and dependency-light on purpose: no Firestore, no `server-only`, so the
 * bucketing can be unit-tested without standing up an emulator.
 */

export const FEE_BUCKETS = [
  "broken",
  "overdue",
  "dueSoon",
  "promised",
  "upcoming",
  "undated",
  "settled",
  "unset",
] as const;

export type FeeBucket = (typeof FEE_BUCKETS)[number];

export const FEE_BUCKET_LABEL: Record<FeeBucket, string> = {
  broken: "Promise broken",
  overdue: "Overdue",
  dueSoon: "Due this week",
  promised: "Promised to pay",
  upcoming: "Not due yet",
  undated: "No due date set",
  settled: "Settled",
  unset: "No fee set",
};

/**
 * How hard each bucket should be pushed, low number first. Drives ordering in
 * the console so the most recoverable money is at the top of the screen rather
 * than wherever the alphabet happens to put it.
 */
export const FEE_BUCKET_RANK: Record<FeeBucket, number> = {
  broken: 0,
  overdue: 1,
  dueSoon: 2,
  undated: 3,
  promised: 4,
  upcoming: 5,
  settled: 6,
  unset: 7,
};

/** Buckets worth a message today. Everything else is noise for the office. */
export const CHASE_BUCKETS: FeeBucket[] = ["broken", "overdue", "dueSoon", "undated"];

export type FeeSchedule = {
  balancePaise: number;
  totalPaise: number;
  /** When the outstanding balance falls due. */
  dueDateMs: number | null;
  /** A date the parent themselves named. Beats the due date while it is live. */
  promisedDateMs: number | null;
};

const DAY = 86_400_000;

/** Local midnight, so "today" means the school's today and not UTC's. */
function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

/**
 * Classify one family.
 *
 * Order of precedence matters and is the whole point:
 *
 *  1. Nothing owed, or no fee set — not a collection problem at all.
 *  2. A promise that has come and gone outranks everything. The parent named
 *     the date themselves, so this is the most recoverable money in the system
 *     and the easiest call to make.
 *  3. A promise still in the future silences the chase, even if the fee is
 *     already overdue. Messaging someone three days after they told you when
 *     they would pay is how a school teaches parents to ignore it.
 *  4. Otherwise fall back to the due date.
 */
export function feeBucket(f: FeeSchedule, now: Date = new Date()): FeeBucket {
  if (f.totalPaise === 0) return "unset";
  if (f.balancePaise <= 0) return "settled";

  const today = startOfDay(now);

  if (f.promisedDateMs !== null) {
    const promised = startOfDay(new Date(f.promisedDateMs));
    if (promised < today) return "broken";
    return "promised";
  }

  if (f.dueDateMs === null) return "undated";

  const due = startOfDay(new Date(f.dueDateMs));
  if (due < today) return "overdue";
  if (due - today <= 7 * DAY) return "dueSoon";
  return "upcoming";
}

/** Whole days overdue. Zero when not overdue, so callers can render it flat. */
export function daysOverdue(f: FeeSchedule, now: Date = new Date()): number {
  const ref = f.promisedDateMs ?? f.dueDateMs;
  if (ref === null || f.balancePaise <= 0) return 0;
  const diff = startOfDay(now) - startOfDay(new Date(ref));
  return diff > 0 ? Math.round(diff / DAY) : 0;
}

function firstName(name: string): string {
  const n = name.trim().split(/\s+/)[0];
  return n && n !== "—" ? n : "there";
}

/**
 * The reminder a staff member sends.
 *
 * Deliberately specific: the child's name and the actual amount, not a template
 * blast. A parent owing ₹2,000 and a parent owing ₹45,000 receiving identical
 * wording is how both learn the message means nothing.
 *
 * It also never threatens. This is a preschool, the parent is usually someone
 * the office knows by sight, and a hard letter costs more goodwill than the
 * balance is worth.
 */
export function feeReminderText(opts: {
  guardianName: string;
  childName: string;
  balancePaise: number;
  bucket: FeeBucket;
}): string {
  const { guardianName, childName, balancePaise, bucket } = opts;
  const amount = formatPaise(balancePaise);
  const open = `Assalamu alaikum ${firstName(guardianName)}, this is Al Fitrah Pre School, Sarjapura.`;

  const middle =
    bucket === "broken"
      ? `Just a gentle follow-up on the fee for ${childName} — ${amount} is still showing as outstanding on our side.`
      : bucket === "overdue"
        ? `A gentle reminder that the fee for ${childName}, ${amount}, is now past its due date.`
        : `A gentle reminder that the fee for ${childName}, ${amount}, is due shortly.`;

  return `${open} ${middle} If it has already been paid, please ignore this and let us know so we can correct our records. Jazakallahu khairan.`;
}

/** wa.me link with the reminder pre-filled. Null when there is nothing dialable. */
export function feeReminderLink(
  phone: string,
  opts: Parameters<typeof feeReminderText>[0],
): string | null {
  return waLink(phone, feeReminderText(opts));
}
