import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { LocationFields } from "@/components/admin/LocationFields";
import { checkIn } from "@/app/admin/(dash)/attendance/actions";
import { formatDistance } from "@/lib/geofence";
import type { CheckIn, StaffDay } from "@/lib/staffAttendance";

function time(ms: number | null): string {
  return ms ? new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—";
}

/** Where a check-in came from, in one phrase. */
function place(entry: CheckIn): string {
  if (entry.distanceM < 0) return "no location";
  return entry.withinFence
    ? `${formatDistance(entry.distanceM)} from campus`
    : `off campus — ${formatDistance(entry.distanceM)} away`;
}

export function CheckInCard({
  me,
  day,
  enforce,
}: {
  me: CheckIn | null;
  day: StaffDay;
  enforce: boolean;
}) {
  const others = Object.values(day.entries).sort((a, b) => (a.atMs ?? 0) - (b.atMs ?? 0));

  return (
    <section className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="how_to_reg" className="text-[18px] text-gold" /> Staff check-in
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            {enforce
              ? "Marking attendance requires being at the campus."
              : "Location is recorded but not enforced yet."}
          </p>
        </div>

        {me ? (
          <p className="rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald-deep">
            Checked in at {time(me.atMs)} · {place(me)}
          </p>
        ) : (
          <ActionForm action={checkIn} className="flex flex-col items-end gap-2">
            <LocationFields />
            <button
              type="submit"
              className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream shadow-soft transition hover:bg-emerald-deep"
            >
              Check in
            </button>
          </ActionForm>
        )}
      </div>

      {!enforce && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-gold-soft/40 px-3 py-2 text-xs text-[#7a611a]">
          <Icon name="info" className="mt-0.5 shrink-0 text-[15px]" />
          The campus pin hasn&apos;t been confirmed yet, so no one is being blocked. Check in from the
          campus, read the distance this card reports, correct the pin in Settings, then switch
          enforcement on.
        </p>
      )}

      {others.length > 0 && (
        <ul className="mt-4 divide-y divide-emerald/5 border-t border-emerald/10 pt-1 text-sm">
          {others.map((entry) => (
            <li key={entry.email} className="flex flex-wrap items-center gap-x-3 py-2">
              <span className="text-ink/75">{entry.email}</span>
              <span className="tabular-nums text-ink/50">{time(entry.atMs)}</span>
              <span
                className={`ml-auto text-xs ${entry.withinFence ? "text-ink/45" : "font-semibold text-red-700"}`}
              >
                {place(entry)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
