import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParent } from "@/lib/parentAuth";
import { getOwnAttendance, getOwnStudent } from "@/lib/portalQueries";
import { formatPaise } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { listDocuments } from "@/lib/studentDocuments";
import { PortalDocuments } from "@/components/portal/PortalDocuments";

export const metadata: Metadata = { title: "Fees & attendance", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmt(ms: number | null): string {
  return ms ? new Date(ms).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

export default async function ChildPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireParent();
  const { studentId } = await params;

  const result = await getOwnStudent(studentId);
  if (!result) notFound();
  const { student, payments } = result;

  const [documents, attendance] = await Promise.all([
    listDocuments(studentId),
    getOwnAttendance(studentId),
  ]);

  const monthLabel = new Date(`${attendance?.monthKey ?? ""}T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-[100dvh] bg-cream-deep/40">
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
          <Icon name="arrow_back" className="text-[18px]" /> All children
        </Link>

        <h1 className="mt-4 font-display text-3xl text-emerald-deep">{student.fullName}</h1>
        <p className="mt-1 text-sm text-ink/55">
          {student.program}
          {student.classSection ? ` · ${student.classSection}` : ""} · {student.admissionNumber}
        </p>

        <dl className="mt-7 grid gap-px overflow-hidden rounded-2xl bg-emerald/10 sm:grid-cols-3">
          <div className="bg-white p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Fee for the year</dt>
            <dd className="mt-1 tabular-nums text-ink/85">{formatPaise(student.fees.totalPaise)}</dd>
            {/* The concession is shown, not just netted out — a family that was
                given one should be able to see it was applied, and a figure
                lower than the published fee otherwise looks like an error. */}
            {student.fees.discountPaise > 0 && (
              <dd className="mt-1 text-[11px] text-ink/45">
                after {formatPaise(student.fees.discountPaise)} concession
              </dd>
            )}
          </div>
          <div className="bg-white p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Paid</dt>
            <dd className="mt-1 tabular-nums text-ink/85">{formatPaise(student.fees.paidPaise)}</dd>
          </div>
          <div className="bg-white p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
              {student.fees.balancePaise < 0 ? "In credit" : "Balance"}
            </dt>
            <dd className={`mt-1 tabular-nums font-semibold ${student.fees.balancePaise > 0 ? "text-red-700" : "text-emerald-deep"}`}>
              {formatPaise(Math.abs(student.fees.balancePaise))}
            </dd>
          </div>
        </dl>

        <section className="mt-8 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
              <Icon name="fact_check" className="text-[18px] text-gold" /> Attendance
            </h2>
            <span className="text-xs text-ink/45">{monthLabel}</span>
          </div>

          {!attendance || attendance.summary.counted === 0 ? (
            <p className="mt-4 text-sm text-ink/50">
              Nothing marked for {monthLabel} yet. The register is filled in by the class teacher each
              morning.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="font-display text-3xl tabular-nums text-emerald-deep">
                    {attendance.summary.percent}%
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-ink/45">This month</p>
                </div>
                <div className="text-sm text-ink/70">
                  <span className="font-semibold text-emerald-deep tabular-nums">
                    {attendance.summary.present}
                  </span>{" "}
                  present ·{" "}
                  <span className="font-semibold tabular-nums text-red-700">
                    {attendance.summary.absent}
                  </span>{" "}
                  away · {attendance.summary.counted} school days marked
                </div>
              </div>

              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-emerald/10"
                role="img"
                aria-label={`${attendance.summary.percent}% present this month`}
              >
                <div
                  className={`h-full ${(attendance.summary.percent ?? 0) < 75 ? "bg-red-600" : "bg-emerald"}`}
                  style={{ width: `${attendance.summary.percent ?? 0}%` }}
                />
              </div>

              <ul className="mt-5 flex flex-wrap gap-1.5">
                {attendance.days.map((d) => (
                  <li
                    key={d.dateKey}
                    title={`${fmt(new Date(`${d.dateKey}T00:00:00`).getTime())} — ${d.status}`}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums ${
                      d.present ? "bg-emerald/10 text-emerald-deep" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {d.dateKey.slice(-2)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink/45">
                Days the register was marked. If something looks wrong, please tell the school office.
              </p>
            </>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="receipt_long" className="text-[18px] text-gold" /> Payments
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50">No payments recorded yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="pb-2 font-semibold">Receipt</th>
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Method</th>
                  <th className="pb-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald/5">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 tabular-nums text-ink/60">{p.receiptNumber}</td>
                    <td className="py-2.5 text-ink/70">{fmt(p.receivedAtMs)}</td>
                    <td className="py-2.5 text-ink/70">{p.method}</td>
                    <td className={`py-2.5 text-right tabular-nums font-semibold ${p.amountPaise < 0 ? "text-red-700" : "text-emerald-deep"}`}>
                      {formatPaise(p.amountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 border-t border-emerald/10 pt-3 text-[11px] text-ink/45">
            For a stamped receipt or any question about fees, please contact the school office.
          </p>
        </section>

        <PortalDocuments studentId={student.id} documents={documents} />
      </main>
    </div>
  );
}
