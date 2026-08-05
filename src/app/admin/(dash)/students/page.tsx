import Link from "next/link";
import { listStudents, STUDENT_STATUSES, STUDENT_STATUS_LABEL, SEARCH_SCAN_LIMIT, type StudentStatus } from "@/lib/students";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<StudentStatus, string> = {
  enrolled: "bg-emerald",
  withdrawn: "bg-ink/30",
  graduated: "bg-gold",
};

function fmtDob(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; after?: string }>;
}) {
  const sp = await searchParams;
  const status = (STUDENT_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as StudentStatus)
    : undefined;
  const q = sp.q?.trim() || "";

  const { rows, counts, total, nextCursor, searchTruncated } = await listStudents({
    status,
    q,
    cursor: sp.after,
  });

  const href = (extra: Record<string, string>) =>
    `/admin/students?${new URLSearchParams({ ...(q ? { q } : {}), ...extra }).toString()}`;

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Roll</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Students</h1>
        <p className="mt-1 text-sm text-ink/55">
          Enrolled children, their guardians, and the details staff need to hand.
        </p>
      </div>

      {/* Status filter */}
      <div className="mt-7 flex flex-wrap gap-2">
        <Link
          href={href({})}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
            !status ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
          }`}
        >
          All <span className="ml-1 tabular-nums opacity-70">{total}</span>
        </Link>
        {STUDENT_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s })}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              status === s ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
            {STUDENT_STATUS_LABEL[s]}
            <span className="tabular-nums opacity-70">{counts[s]}</span>
          </Link>
        ))}
        <form action="/admin/students" method="get" className="relative ml-auto w-full lg:w-72">
          {status && <input type="hidden" name="status" value={status} />}
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink/35" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, admission no., guardian…"
            className="w-full rounded-full border border-emerald/15 bg-white py-2.5 pl-10 pr-4 text-sm text-ink shadow-soft outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-2 focus:ring-emerald/20"
          />
        </form>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
              <Icon name={q || status ? "search_off" : "school"} className="text-[30px]" />
            </span>
            <p className="font-display text-lg text-emerald-deep">
              {q || status ? "No matching students" : "No students yet"}
            </p>
            <p className="max-w-sm text-sm text-ink/50">
              {q || status
                ? "Try clearing the filter or search."
                : "Move an admission enquiry to Admitted, then enrol it from the lead page."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald/10 bg-cream/40 text-[11px] uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Admission no.</th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Program</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">Date of birth</th>
                <th className="hidden px-5 py-3 font-semibold lg:table-cell">Primary guardian</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {rows.map((s) => {
                const primary = s.guardians.find((g) => g.isPrimary) ?? s.guardians[0];
                return (
                  <tr key={s.id} className="transition hover:bg-emerald/[0.035]">
                    <td className="px-5 py-3.5 tabular-nums text-ink/60">{s.admissionNumber}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/students/${s.id}`} className="font-semibold text-emerald-deep hover:text-emerald">
                        {s.fullName}
                      </Link>
                      {s.classSection && <span className="ml-2 text-xs text-ink/45">{s.classSection}</span>}
                    </td>
                    <td className="hidden px-5 py-3.5 text-ink/70 sm:table-cell">{s.program}</td>
                    <td className="hidden px-5 py-3.5 text-ink/70 md:table-cell">{fmtDob(s.dobMs)}</td>
                    <td className="hidden px-5 py-3.5 text-ink/70 lg:table-cell">
                      {primary ? (
                        <>
                          <span className="block">{primary.name}</span>
                          <span className="block text-xs tabular-nums text-ink/45">{primary.phone}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                        {STUDENT_STATUS_LABEL[s.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {searchTruncated && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold-soft/40 px-4 py-3 text-xs text-[#7a611a]">
          <Icon name="info" className="text-[16px]" />
          Searched the first {SEARCH_SCAN_LIMIT} students by admission number. Filter by status first if you
          expect an older match.
        </p>
      )}

      {(nextCursor || sp.after) && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
          {sp.after ? (
            <Link
              href={href({ ...(status ? { status } : {}) })}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              <Icon name="first_page" className="text-[18px]" /> First page
            </Link>
          ) : (
            <span />
          )}
          {nextCursor && (
            <Link
              href={href({ ...(status ? { status } : {}), after: nextCursor })}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              Next <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
