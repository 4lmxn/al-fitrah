import Link from "next/link";
import { getAttendanceStatuses, getClassSections } from "@/lib/taxonomy";
import { getSettings } from "@/lib/settings";
import {
  academicYearMonths,
  getRollups,
  recentAcademicYears,
  summariseMonth,
  totalOf,
} from "@/lib/attendance";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/admin/EmptyState";
import { CARD, SECTION_LABEL } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export default async function AttendanceTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const [sections, statuses, settings] = await Promise.all([
    getClassSections(),
    getAttendanceStatuses(),
    getSettings(),
  ]);

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Attendance</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Trends</h1>
        <EmptyState icon="groups" title="No classes set up yet" className={`${CARD} mt-7`}>
          A trend is a class over a year, so the register needs your class or section names first.
        </EmptyState>
      </div>
    );
  }

  const years = recentAcademicYears();
  const academicYear = years.includes(sp.year ?? "") ? (sp.year as string) : years[0];
  const classSection = sections.includes(sp.class ?? "") ? (sp.class as string) : sections[0];
  const lowThreshold = settings.attendance.lowAttendancePercent;

  const rollups = await getRollups(academicYear, classSection);
  const months = academicYearMonths(academicYear).map((month) =>
    summariseMonth(rollups.get(month) ?? null, month, statuses),
  );
  const year = totalOf(months);
  const peak = Math.max(...months.map((m) => m.percent ?? 0), 1);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Attendance</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Trends</h1>
          <p className="mt-1 text-sm text-ink/55">
            How a class attended across the year, month by month. Built from the registers as they
            are saved.
          </p>
        </div>
        <Link
          href={`/admin/attendance?class=${encodeURIComponent(classSection)}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
        >
          <Icon name="event_available" className="text-[18px]" /> Daily register
        </Link>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        {sections.map((c: string) => (
          <Link
            key={c}
            href={`/admin/attendance/trends?${new URLSearchParams({ class: c, year: academicYear })}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              c === classSection
                ? "bg-emerald text-cream ring-emerald"
                : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            {c}
          </Link>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/attendance/trends?${new URLSearchParams({ class: classSection, year: y })}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ring-1 ring-inset transition ${
                y === academicYear
                  ? "bg-ink/80 text-cream ring-ink/80"
                  : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className={`${CARD} mt-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4`}>
        <h2 className={SECTION_LABEL}>
          <Icon name="insights" className="text-[18px]" />
          {classSection} · {academicYear}
        </h2>
        <p className="text-sm text-ink/60">
          {year.counted === 0 ? (
            "Nothing marked yet"
          ) : (
            <>
              <span
                className={`text-lg font-semibold tabular-nums ${
                  year.percent !== null && year.percent < lowThreshold
                    ? "text-red-700"
                    : "text-emerald-deep"
                }`}
              >
                {year.percent}%
              </span>{" "}
              across {year.daysMarked} {year.daysMarked === 1 ? "day" : "days"} ·{" "}
              {year.present}/{year.counted} marks present
            </>
          )}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {months.map((m) => {
          const low = m.percent !== null && m.percent < lowThreshold;
          return (
            <li key={m.month} className={`${CARD} flex items-center gap-4 px-5 py-3`}>
              <p className="w-24 shrink-0 text-sm font-semibold text-emerald-deep">
                {monthLabel(m.month)}
              </p>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-emerald/10"
                aria-hidden="true"
              >
                {m.percent !== null && (
                  <span
                    className={`block h-full rounded-full ${low ? "bg-red-600" : "bg-emerald"}`}
                    style={{ width: `${Math.round((m.percent / peak) * 100)}%` }}
                  />
                )}
              </span>
              {m.percent === null ? (
                <p className="w-40 shrink-0 text-right text-xs text-ink/40">Not marked</p>
              ) : (
                <p className="w-40 shrink-0 text-right text-xs text-ink/50">
                  <span
                    className={`text-sm font-semibold tabular-nums ${low ? "text-red-700" : "text-ink/70"}`}
                  >
                    {m.percent}%
                  </span>{" "}
                  · {m.daysMarked} {m.daysMarked === 1 ? "day" : "days"}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-ink/45">
        A month shows &ldquo;not marked&rdquo; when no register was saved for it. Months before this
        feature shipped stay empty until the backfill in <code>docs/ops.md</code> is run.
      </p>
    </div>
  );
}
