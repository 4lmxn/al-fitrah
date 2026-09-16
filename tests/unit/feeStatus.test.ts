import { describe, it, expect } from "vitest";
import { feeBucket, daysOverdue, feeReminderText, type FeeSchedule } from "@/lib/feeStatus";

const NOW = new Date("2026-08-18T11:00:00+05:30");
const day = (iso: string) => new Date(`${iso}T00:00:00+05:30`).getTime();

const owing = (over: Partial<FeeSchedule> = {}): FeeSchedule => ({
  totalPaise: 2_500_000,
  balancePaise: 1_800_000,
  dueDateMs: null,
  promisedDateMs: null,
  ...over,
});

describe("who to chase for fees", () => {
  it("ignores families with nothing to collect", () => {
    expect(feeBucket(owing({ totalPaise: 0, balancePaise: 0 }), NOW)).toBe("unset");
    expect(feeBucket(owing({ balancePaise: 0 }), NOW)).toBe("settled");
    // An overpayment is settled, not a negative debt to chase.
    expect(feeBucket(owing({ balancePaise: -50_000 }), NOW)).toBe("settled");
  });

  it("sorts an owing family by its due date", () => {
    expect(feeBucket(owing({ dueDateMs: day("2026-08-01") }), NOW)).toBe("overdue");
    expect(feeBucket(owing({ dueDateMs: day("2026-08-22") }), NOW)).toBe("dueSoon");
    expect(feeBucket(owing({ dueDateMs: day("2026-09-30") }), NOW)).toBe("upcoming");
    expect(feeBucket(owing(), NOW)).toBe("undated");
  });

  it("treats today's due date as due, not yet overdue", () => {
    expect(feeBucket(owing({ dueDateMs: day("2026-08-18") }), NOW)).toBe("dueSoon");
  });

  it("stops chasing a parent who named a date, even when already overdue", () => {
    // The point of the whole module: messaging someone three days after they
    // told you when they would pay is how a school trains parents to ignore it.
    const f = owing({ dueDateMs: day("2026-07-01"), promisedDateMs: day("2026-08-25") });
    expect(feeBucket(f, NOW)).toBe("promised");
  });

  it("puts a broken promise above everything else", () => {
    const f = owing({ dueDateMs: day("2026-09-30"), promisedDateMs: day("2026-08-14") });
    expect(feeBucket(f, NOW)).toBe("broken");
  });

  it("counts days from the promise once one exists, not the due date", () => {
    expect(daysOverdue(owing({ dueDateMs: day("2026-08-08") }), NOW)).toBe(10);
    expect(daysOverdue(owing({ dueDateMs: day("2026-08-08"), promisedDateMs: day("2026-08-15") }), NOW)).toBe(3);
    expect(daysOverdue(owing({ dueDateMs: day("2026-09-30") }), NOW)).toBe(0);
    // Nothing owed cannot be overdue, whatever the dates say.
    expect(daysOverdue(owing({ balancePaise: 0, dueDateMs: day("2026-01-01") }), NOW)).toBe(0);
  });
});

describe("the reminder a parent receives", () => {
  const base = { guardianName: "Sara Khan", childName: "Yusuf", balancePaise: 1_800_000 };

  it("names the child and the actual amount", () => {
    const text = feeReminderText({ ...base, bucket: "overdue" });
    expect(text).toContain("Sara");
    expect(text).toContain("Yusuf");
    expect(text).toContain("18,000");
  });

  it("says something different once a promise has lapsed", () => {
    const overdue = feeReminderText({ ...base, bucket: "overdue" });
    const broken = feeReminderText({ ...base, bucket: "broken" });
    expect(broken).not.toBe(overdue);
  });

  it("always leaves room for the school's records being wrong", () => {
    for (const bucket of ["broken", "overdue", "dueSoon"] as const) {
      expect(feeReminderText({ ...base, bucket })).toContain("already been paid");
    }
  });

  it("falls back to a greeting when the guardian name is a placeholder", () => {
    expect(feeReminderText({ ...base, guardianName: "—", bucket: "dueSoon" })).toContain("alaikum there");
  });
});

describe("the reminder can carry the school's payment link", () => {
  const base = {
    guardianName: "Fatima Sheikh",
    childName: "Zayd",
    balancePaise: 250000,
  } as const;

  it("includes the link when the school has set one", () => {
    const text = feeReminderText({
      ...base,
      bucket: "overdue",
      payUrl: "https://www.onlinesbi.sbi/sbicollect/x",
    });
    expect(text).toContain("https://www.onlinesbi.sbi/sbicollect/x");
  });

  it("says nothing about paying online when no link is set", () => {
    const text = feeReminderText({ ...base, bucket: "overdue" });
    expect(text).not.toContain("pay online");
  });

  it("still tells a parent who has already paid to ignore it", () => {
    // SBI Collect does not notify this system, so a reminder can always reach
    // someone who paid this morning. The escape hatch must survive the link.
    const text = feeReminderText({
      ...base,
      bucket: "broken",
      payUrl: "https://www.onlinesbi.sbi/sbicollect/x",
    });
    expect(text).toContain("already been paid");
  });
});
