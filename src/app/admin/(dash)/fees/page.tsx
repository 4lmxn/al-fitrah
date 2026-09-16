import Link from "next/link";
import { listStudents, type Student } from "@/lib/students";
import { formatPaise } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import {
  feeBucket,
  daysOverdue,
  feeReminderLink,
  CHASE_BUCKETS,
  FEE_BUCKET_LABEL,
  FEE_BUCKET_RANK,
  type FeeBucket,
} from "@/lib/feeStatus";
import { RemindButton } from "@/components/admin/RemindButton";
import { formatDate } from "@/lib/relativeTime";
import { EmptyState } from "@/components/admin/EmptyState";
import { CARD } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

const bucketStyle: Record<FeeBucket, { chip: string; icon: string }> = {
  broken: { chip: "bg-red-50 text-red-700", icon: "notification_important" },
  overdue: { chip: "bg-red-50 text-red-700", icon: "error" },
  dueSoon: { chip: "bg-gold-soft text-ink", icon: "schedule" },
  undated: { chip: "bg-ink/5 text-ink/60", icon: "event_busy" },
  promised: { chip: "bg-emerald/10 text-emerald-deep", icon: "handshake" },
  upcoming: { chip: "bg-ink/5 text-ink/60", icon: "event" },
  settled: { chip: "bg-emerald/10 text-emerald-deep", icon: "task_alt" },
  unset: { chip: "bg-ink/5 text-ink/50", icon: "info" },
};

const bucketBlurb: Partial<Record<FeeBucket, string>> = {
  broken: "They named this date themselves and it has passed. Most recoverable money in the system — call these first.",
  overdue: "Past the due date with no promise on record.",
  dueSoon: "Due within seven days. A nudge now costs less than a chase later.",
  undated: "Owing, but nobody has set a due date, so nothing can tell you when to follow up.",
};

function primaryGuardian(s: Student): { name: string; phone: string } {
  const g = s.guardians.find((x) => x.isPrimary) ?? s.guardians[0];
  return { name: g?.name ?? "—", phone: g?.phone ?? s.guardianPhones[0] ?? "" };
}

function Row({ s, bucket }: { s: Student; bucket: FeeBucket }) {
  const g = primaryGuardian(s);
  const late = daysOverdue(s.fees);
  const wa = g.phone
    ? feeReminderLink(g.phone, {
        guardianName: g.name,
        childName: s.firstName || s.fullName,
        balancePaise: s.fees.balancePaise,
        bucket,
      })
    : null;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-emerald/10 px-5 py-4 last:border-0">
      <div className="min-w-[12rem] flex-1">
        <Link href={`/admin/students/${s.id}`} className="font-semibold text-emerald-deep hover:underline">
          {s.fullName}
        </Link>
        <p className="text-xs text-ink/50">
          {s.classSection ?? s.program} · {g.name}
          {late > 0 && <span className="ml-1.5 font-semibold text-red-700">{late}d late</span>}
        </p>
        {s.fees.promiseNote && bucket === "broken" && (
          <p className="mt-1 text-xs italic text-ink/60">&ldquo;{s.fees.promiseNote}&rdquo;</p>
        )}
      </div>

      <div className="text-right">
        <p className="font-display text-lg tabular-nums text-emerald-deep">{formatPaise(s.fees.balancePaise)}</p>
        <p className="text-[11px] text-ink/45">
          {bucket === "promised" || bucket === "broken"
            ? `promised ${formatDate(s.fees.promisedDateMs, "day")}`
            : s.fees.dueDateMs
              ? `due ${formatDate(s.fees.dueDateMs, "day")}`
              : "no due date"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {wa ? (
          <RemindButton studentId={s.id} href={wa} />
        ) : (
          <span className="text-xs text-ink/40">no phone</span>
        )}
        <Link
          href={`/admin/students/${s.id}#fees`}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 px-3.5 py-2 text-xs font-semibold text-emerald transition hover:bg-emerald/5"
        >
          <Icon name="handshake" className="text-[16px]" /> Log promise
        </Link>
      </div>

      {s.fees.lastRemindedMs && (
        <p className="w-full text-[11px] text-ink/40">Last reminded {formatDate(s.fees.lastRemindedMs, "day")}</p>
      )}
    </li>
  );
}

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const sp = await searchParams;
  const { rows, nextCursor } = await listStudents({ status: "enrolled", cursor: sp.after });

  const now = new Date();
  const graded = rows
    .map((s) => ({ s, bucket: feeBucket(s.fees, now) }))
    .sort((a, b) => FEE_BUCKET_RANK[a.bucket] - FEE_BUCKET_RANK[b.bucket] || b.s.fees.balancePaise - a.s.fees.balancePaise);

  const chase = graded.filter((g) => CHASE_BUCKETS.includes(g.bucket));
  const promised = graded.filter((g) => g.bucket === "promised");
  const chaseTotal = chase.reduce((sum, g) => sum + g.s.fees.balancePaise, 0);
  const promisedTotal = promised.reduce((sum, g) => sum + g.s.fees.balancePaise, 0);
  const unset = graded.filter((g) => g.bucket === "unset").length;

  const groups = CHASE_BUCKETS.map((b) => ({ bucket: b, items: chase.filter((g) => g.bucket === b) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Finance</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Fee collection</h1>
          <p className="mt-1 text-sm text-ink/55">
            Grouped by what to do about each family, not just by what they owe. Record payments on a
            child&apos;s record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/fees/import"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
          >
            <Icon name="upload_file" className="text-[18px]" /> Import payments
          </Link>
          <Link
            href="/admin/fees/structures"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
          >
            <Icon name="receipt_long" className="text-[18px]" /> Fee structures
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Worth chasing today</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-emerald-deep">{formatPaise(chaseTotal)}</p>
          <p className="mt-0.5 text-xs text-ink/45">{chase.length} {chase.length === 1 ? "family" : "families"}</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Promised, not yet due</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-emerald-deep">{formatPaise(promisedTotal)}</p>
          <p className="mt-0.5 text-xs text-ink/45">{promised.length} waiting on a date they gave</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">No fee set yet</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-emerald-deep">{unset}</p>
          <p className="mt-0.5 text-xs text-ink/45">invisible to collection until set</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="task_alt"
          title="Nobody to chase on this page"
          className={`${CARD} mt-5`}
        >
          {unset > 0
            ? `${unset} ${unset === 1 ? "child has" : "children have"} no fee set yet — set a total on their record so they appear here.`
            : "Every enrolled family on this page is settled, promised, or not yet due."}
        </EmptyState>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map(({ bucket, items }) => (
            <section key={bucket} className={`${CARD} overflow-hidden`}>
              <div className="flex flex-wrap items-center gap-3 border-b border-emerald/10 bg-cream/40 px-5 py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${bucketStyle[bucket].chip}`}>
                  <Icon name={bucketStyle[bucket].icon} className="text-[15px]" />
                  {FEE_BUCKET_LABEL[bucket]}
                </span>
                <span className="text-xs font-semibold text-ink/45">{items.length}</span>
                {bucketBlurb[bucket] && <p className="w-full text-xs text-ink/55">{bucketBlurb[bucket]}</p>}
              </div>
              <ul>
                {items.map(({ s, bucket: b }) => (
                  <Row key={s.id} s={s} bucket={b} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {promised.length > 0 && (
        <section className={`${CARD} mt-5 overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-emerald/10 bg-cream/40 px-5 py-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${bucketStyle.promised.chip}`}>
              <Icon name="handshake" className="text-[15px]" /> {FEE_BUCKET_LABEL.promised}
            </span>
            <span className="text-xs font-semibold text-ink/45">{promised.length}</span>
            <p className="w-full text-xs text-ink/55">
              Left alone deliberately until the date they gave passes. They move to the top of this page the morning after.
            </p>
          </div>
          <ul>
            {promised.map(({ s, bucket }) => (
              <Row key={s.id} s={s} bucket={bucket} />
            ))}
          </ul>
        </section>
      )}

      {nextCursor && (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/admin/fees?after=${encodeURIComponent(nextCursor)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 px-4 py-2 text-sm font-semibold text-emerald transition hover:bg-emerald/5"
          >
            Next page <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </div>
      )}
    </div>
  );
}
