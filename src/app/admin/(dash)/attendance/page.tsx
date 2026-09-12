import Link from "next/link";
import { academicYearFor, listClassRoster } from "@/lib/students";
import { getAttendanceStatuses, getClassSections } from "@/lib/taxonomy";
import { getSettings } from "@/lib/settings";
import {
  dateKey,
  defaultStatusFor,
  getRegister,
  isFuture,
  isWeekend,
  listRegisters,
  monthBounds,
  summarise,
} from "@/lib/attendance";
import { getStaffDay, staffKey } from "@/lib/staffAttendance";
import { requireAdmin } from "@/lib/adminAuth";
import { saveRegister } from "./actions";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { CheckInCard } from "@/components/admin/CheckInCard";
import { LocationFields } from "@/components/admin/LocationFields";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  present: "peer-checked:bg-emerald peer-checked:text-cream peer-checked:ring-emerald",
  absent: "peer-checked:bg-red-600 peer-checked:text-white peer-checked:ring-red-600",
  late: "peer-checked:bg-gold peer-checked:text-ink peer-checked:ring-gold",
  excused: "peer-checked:bg-ink/70 peer-checked:text-cream peer-checked:ring-ink/70",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const today = dateKey();
  const [sections, statuses, settings, admin, staffDay] = await Promise.all([
    getClassSections(),
    getAttendanceStatuses(),
    getSettings(),
    requireAdmin(),
    getStaffDay(),
  ]);
  const nonSchoolDays = settings.attendance.nonSchoolDays;
  const lowThreshold = settings.attendance.lowAttendancePercent;
  const classSection = sections.includes(sp.class ?? "") ? (sp.class as string) : sections[0];
  const key = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? (sp.date as string) : today;
  const academicYear = academicYearFor(new Date(`${key}T00:00:00`));

  const blocked = isFuture(key) ? "future" : isWeekend(key, nonSchoolDays) ? "weekend" : null;

  // Roster, today's register, and the month's registers for the summary column.
  // Three reads plus the roster — flat in the number of days, not children.
  const [roster, register, month] = await Promise.all([
    listClassRoster(classSection),
    getRegister(academicYear, classSection, key),
    (async () => {
      const { from, to } = monthBounds(key);
      return listRegisters(academicYear, classSection, from, to);
    })(),
  ]);

  const href = (extra: Record<string, string>) =>
    `/admin/attendance?${new URLSearchParams({ class: classSection, date: key, ...extra }).toString()}`;

  const marked = register !== null;
  const fallback = defaultStatusFor(key, statuses, nonSchoolDays);

  // Nothing to register against until the school names its classes. Said
  // plainly, with the way to fix it, rather than rendering an empty picker over
  // an empty roll and leaving staff to guess what is broken.
  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Daily register</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Attendance</h1>
        <div className="mt-7 rounded-xl3 border border-emerald/10 bg-white/90 p-8 text-center shadow-soft">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-ink">
            <Icon name="groups" className="text-[24px]" />
          </span>
          <h2 className="text-lg font-semibold text-emerald-deep">No classes set up yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">
            Attendance is taken one class at a time, so the register needs your class or
            section names first — whatever you actually call them.
          </p>
          <Link
            href="/admin/settings"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
          >
            <Icon name="settings" className="text-[18px]" />
            Add class sections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Daily register</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Attendance</h1>
          <p className="mt-1 text-sm text-ink/55">
            Everyone starts present — just mark the exceptions. You can save again to correct a day.
          </p>
        </div>
        {marked && (
          <p className="text-xs text-ink/50">
            Last saved by {register.markedBy ?? "—"}
          </p>
        )}
      </div>

      <CheckInCard
        me={staffDay.entries[staffKey(admin.email)] ?? null}
        day={staffDay}
        enforce={settings.attendance.campus.enforce}
      />

      {/* Class + date pickers */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        {sections.map((c: string) => (
          <Link
            key={c}
            href={`/admin/attendance?${new URLSearchParams({ class: c, date: key })}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              c === classSection ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            {c}
          </Link>
        ))}
        <form method="get" action="/admin/attendance" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="class" value={classSection} />
          <input
            type="date"
            name="date"
            defaultValue={key}
            max={today}
            className="rounded-lg border border-emerald/15 bg-white px-3 py-2 text-sm text-ink shadow-soft outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
          />
          <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5">
            Go
          </button>
        </form>
      </div>

      {blocked ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold-soft/40 px-5 py-4 text-sm text-[#7a611a]">
          <Icon name="event_busy" className="text-[20px]" />
          {blocked === "future"
            ? "That date hasn't happened yet. Attendance can only be marked for today or earlier."
            : "That's not a school day. Pick another date."}
          {key !== today && (
            <Link href={href({ date: today })} className="ml-auto font-semibold underline">
              Go to today
            </Link>
          )}
        </div>
      ) : roster.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-emerald/10 bg-white/90 p-16 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
            <Icon name="groups" className="text-[30px]" />
          </span>
          <p className="font-display text-lg text-emerald-deep">No children in {classSection}</p>
          <p className="max-w-sm text-sm text-ink/50">
            Assign a class section on a student&apos;s record and they will appear here.
          </p>
          <Link href="/admin/students" className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
            Go to students
          </Link>
        </div>
      ) : (
        <ActionForm action={saveRegister} className="mt-6">
          <input type="hidden" name="classSection" value={classSection} />
          <input type="hidden" name="dateKey" value={key} />

          <div className="overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
            <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="border-b border-emerald/10 bg-cream/40 text-[11px] uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-5 py-3 font-semibold">Child</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="hidden px-5 py-3 text-right font-semibold sm:table-cell">This month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald/5">
                {roster.map((s) => {
                  const current = register?.entries[s.id] ?? fallback ?? "present";
                  const stats = summarise(month, s.id, statuses);
                  return (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <Link href={`/admin/students/${s.id}`} className="font-semibold text-emerald-deep hover:text-emerald">
                          {s.fullName}
                        </Link>
                        <span className="ml-2 text-xs tabular-nums text-ink/40">{s.admissionNumber}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {statuses.map(({ id: status, label: statusLabel }) => (
                            <label key={status} className="cursor-pointer">
                              <input
                                type="radio"
                                name={`s:${s.id}`}
                                value={status}
                                defaultChecked={current === status}
                                className="peer sr-only"
                              />
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-ink/60 ring-1 ring-inset ring-emerald/15 transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald ${STATUS_STYLE[status]}`}
                              >
                                {statusLabel}
                              </span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-right sm:table-cell">
                        {stats.percent === null ? (
                          <span className="text-xs text-ink/35">—</span>
                        ) : (
                          <span className={`text-sm font-semibold tabular-nums ${stats.percent < lowThreshold ? "text-red-700" : "text-ink/60"}`}>
                            {stats.percent}%
                            <span className="ml-1 text-[11px] font-normal text-ink/40">
                              {stats.present}/{stats.counted}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Same fence as staff check-in — a register marked from off-campus
                is the thing the feature exists to stop. */}
            <LocationFields />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
            >
              <Icon name="check" className="text-[18px]" />
              {marked ? "Update register" : "Save register"}
            </button>
            <p className="text-xs text-ink/45">
              {roster.length} {roster.length === 1 ? "child" : "children"} in {classSection} ·{" "}
              {new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "full" })}
            </p>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
