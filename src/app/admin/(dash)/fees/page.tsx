import Link from "next/link";
import { listStudents } from "@/lib/students";
import { formatPaise } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

/**
 * Who still owes money.
 *
 * The balance is derived (total − paid), so Firestore can't filter or sort on
 * it. Rather than reading every student to find the ones with dues, this pages
 * through enrolled students and filters the page — the read count stays bounded
 * by page size, and the answer stays honest by saying which page it covers.
 *
 * ponytail: if the school ever wants "all dues, sorted by size", store
 * balancePaise as a field maintained by the same writes that change total or
 * paid, and query it directly. Not worth the extra write until asked.
 */
export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const sp = await searchParams;
  const { rows, nextCursor } = await listStudents({ status: "enrolled", cursor: sp.after });

  const owing = rows.filter((s) => s.fees.balancePaise > 0);
  const dueOnPage = owing.reduce((sum, s) => sum + s.fees.balancePaise, 0);
  const unset = rows.filter((s) => s.fees.totalPaise === 0).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Finance</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Fees</h1>
        <p className="mt-1 text-sm text-ink/55">
          Enrolled children with an outstanding balance. Record payments on a child&apos;s record.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Outstanding on this page</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-emerald-deep">{formatPaise(dueOnPage)}</p>
        </div>
        <div className="rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Families owing</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-emerald-deep">{owing.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">No fee set yet</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-emerald-deep">{unset}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
        {owing.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
              <Icon name="task_alt" className="text-[30px]" />
            </span>
            <p className="font-display text-lg text-emerald-deep">Nothing outstanding here</p>
            <p className="max-w-sm text-sm text-ink/50">
              {unset > 0
                ? `${unset} ${unset === 1 ? "child has" : "children have"} no fee set yet — set a total on their record.`
                : "Every enrolled child on this page has settled."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald/10 bg-cream/40 text-[11px] uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Child</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Class</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">Guardian</th>
                <th className="px-5 py-3 text-right font-semibold">Paid</th>
                <th className="px-5 py-3 text-right font-semibold">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {owing.map((s) => {
                const g = s.guardians.find((x) => x.isPrimary) ?? s.guardians[0];
                return (
                  <tr key={s.id} className="transition hover:bg-emerald/[0.035]">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/students/${s.id}`} className="font-semibold text-emerald-deep hover:text-emerald">
                        {s.fullName}
                      </Link>
                      <span className="ml-2 text-xs tabular-nums text-ink/40">{s.admissionNumber}</span>
                    </td>
                    <td className="hidden px-5 py-3.5 text-ink/70 sm:table-cell">{s.classSection ?? "—"}</td>
                    <td className="hidden px-5 py-3.5 text-ink/70 md:table-cell">
                      {g ? (
                        <>
                          <span className="block">{g.name}</span>
                          <span className="block text-xs tabular-nums text-ink/45">{g.phone}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink/60">{formatPaise(s.fees.paidPaise)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-red-700">
                      {formatPaise(s.fees.balancePaise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-ink/45">
        Totals cover the {rows.length} enrolled {rows.length === 1 ? "child" : "children"} on this page, not the
        whole school — the balance is derived, so it can&apos;t be summed by a query.
      </p>

      {(nextCursor || sp.after) && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
          {sp.after ? (
            <Link href="/admin/fees" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5">
              <Icon name="first_page" className="text-[18px]" /> First page
            </Link>
          ) : (
            <span />
          )}
          {nextCursor && (
            <Link
              href={`/admin/fees?after=${encodeURIComponent(nextCursor)}`}
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
