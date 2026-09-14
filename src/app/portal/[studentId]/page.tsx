import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParent } from "@/lib/parentAuth";
import { getOwnStudent } from "@/lib/portalQueries";
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

  const documents = await listDocuments(studentId);

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
