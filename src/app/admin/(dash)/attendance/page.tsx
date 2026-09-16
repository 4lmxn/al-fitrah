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
import { RegisterSummary } from "@/components/admin/RegisterSummary";
import { CheckInCard } from "@/components/admin/CheckInCard";
import { LocationFields } from "@/components/admin/LocationFields";
import { EmptyState } from "@/components/admin/EmptyState";
import { CARD } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

const REGISTER_FORM_ID = "attendance-register";

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
        <EmptyState
          icon="groups"
          title={<>No children in {classSection}</>}
          className={`${CARD} mt-6`}
          action={
            <Link href="/admin/students" className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
                    Go to students
                  </Link>
          }
        >
          Assign a class section on a student&apos;s record and they will appear here.
        </EmptyState>
      ) : (
        <ActionForm id={REGISTER_FORM_ID} action={saveRegister} className="mt-6 pb-28 sm:pb-0">
          <input type="hidden" name="classSection" value={classSection} />
          <input type="hidden" name="dateKey" value={key} />

          <div className={`${CARD} mb-4 flex flex-wrap items-center justify-between gap-4 px-5 py-4`}>
            <RegisterSummary
              formId={REGISTER_FORM_ID}
              presentIds={statuses.filter((s) => s.present).map((s) => s.id)}
              total={roster.length}
            />
            <p className="text-xs text-ink/45">
              {classSection} ·{" "}
              {new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
          </div>

          <ul className="space-y-2">
            {roster.map((s) => {
              const current = register?.entries[s.id] ?? fallback ?? "present";
              const stats = summarise(month, s.id, statuses);
              const low = stats.percent !== null && stats.percent < lowThreshold;
              return (
                <li
                  key={s.id}
                  className={`${CARD} p-4 transition hover:border-emerald/20`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="font-semibold text-emerald-deep hover:text-emerald"
                      >
                        {s.fullName}
                      </Link>
                      <p className="mt-0.5 text-xs tabular-nums text-ink/40">{s.admissionNumber}</p>
                    </div>

                    {stats.percent !== null && (
                      <div className="shrink-0 text-right">
                        <span
                          className={`text-sm font-semibold tabular-nums ${low ? "text-red-700" : "text-ink/55"}`}
                        >
                          {stats.percent}%
                        </span>
                        <span className="ml-1 text-[11px] text-ink/40">
                          {stats.present}/{stats.counted}
                        </span>
                        <span
                          className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-emerald/10"
                          aria-hidden="true"
                        >
                          <span
                            className={`block h-full rounded-full ${low ? "bg-red-600" : "bg-emerald"}`}
                            style={{ width: `${stats.percent}%` }}
                          />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
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
                          className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-ink/60 ring-1 ring-inset ring-emerald/15 transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald sm:min-h-9 sm:rounded-full sm:px-3.5 sm:text-xs ${STATUS_STYLE[status]}`}
                        >
                          {statusLabel}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-emerald/10 bg-cream-deep/95 px-4 py-3 backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
              <LocationFields />
              <button
                type="submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald px-6 text-sm font-semibold text-cream transition hover:bg-emerald-deep sm:flex-none"
              >
                <Icon name="check" className="text-[18px]" />
                {marked ? "Update register" : "Save register"}
              </button>
              <p className="hidden text-xs text-ink/45 sm:block">
                {roster.length} {roster.length === 1 ? "child" : "children"} in {classSection} ·{" "}
                {new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "full" })}
              </p>
            </div>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
