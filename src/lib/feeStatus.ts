import { waLink } from "@/lib/phone";
import { formatPaise } from "@/lib/money";

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

export const CHASE_BUCKETS: FeeBucket[] = ["broken", "overdue", "dueSoon", "undated"];

export type FeeSchedule = {
  balancePaise: number;
  totalPaise: number;
  dueDateMs: number | null;
  promisedDateMs: number | null;
};

const DAY = 86_400_000;

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

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

export function feeReminderLink(
  phone: string,
  opts: Parameters<typeof feeReminderText>[0],
): string | null {
  return waLink(phone, feeReminderText(opts));
}
