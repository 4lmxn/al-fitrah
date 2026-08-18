import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { type Payment, type StudentFees } from "@/lib/fees";
import { setFeeTotal, recordPayment, setFeeDueDate, logFeePromise } from "@/app/admin/(dash)/students/fees-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Icon } from "@/components/ui/Icon";
import { feeBucket, FEE_BUCKET_LABEL } from "@/lib/feeStatus";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

function fmtDate(ms: number | null): string {
  return ms ? new Date(ms).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

function todayInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function FeesPanel({
  studentId,
  fees,
  payments,
  methods,
}: {
  studentId: string;
  fees: StudentFees;
  payments: Payment[];
  /** Configured payment methods — settings are not readable from a client component. */
  methods: string[];
}) {
  const settled = fees.balancePaise <= 0 && fees.totalPaise > 0;
  const bucket = feeBucket(fees);
  const urgent = bucket === "broken" || bucket === "overdue";

  const dayInput = (ms: number | null): string => {
    if (!ms) return "";
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  return (
    <section id="fees" className="mt-6 scroll-mt-24 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="payments" className="text-[18px] text-gold" /> Fees
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            settled
              ? "bg-emerald/8 text-emerald-deep"
              : urgent
                ? "bg-red-50 text-red-700"
                : fees.balancePaise > 0
                  ? "bg-gold-soft text-ink"
                  : "bg-ink/5 text-ink/50"
          }`}
        >
          {fees.totalPaise === 0
            ? "No fee set"
            : settled
              ? "Settled"
              : `${formatPaise(fees.balancePaise)} · ${FEE_BUCKET_LABEL[bucket]}`}
        </span>
      </div>

      <dl className="mt-4 grid gap-px overflow-hidden rounded-xl bg-emerald/10 sm:grid-cols-3">
        <div className="bg-white p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Total for the year</dt>
          <dd className="mt-1 tabular-nums text-ink/85">{formatPaise(fees.totalPaise)}</dd>
        </div>
        <div className="bg-white p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Paid</dt>
          <dd className="mt-1 tabular-nums text-ink/85">{formatPaise(fees.paidPaise)}</dd>
        </div>
        <div className="bg-white p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
            {fees.balancePaise < 0 ? "Overpaid" : "Balance"}
          </dt>
          <dd className={`mt-1 tabular-nums font-semibold ${fees.balancePaise > 0 ? "text-red-700" : "text-emerald-deep"}`}>
            {formatPaise(Math.abs(fees.balancePaise))}
          </dd>
        </div>
      </dl>

      <ActionForm action={setFeeTotal} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={studentId} />
        <label className="block">
          <span className={label}>Set total for the year (₹)</span>
          <input
            name="total"
            inputMode="decimal"
            defaultValue={fees.totalPaise ? (fees.totalPaise / 100).toFixed(2) : ""}
            placeholder="25000"
            className={`${field} w-40`}
          />
        </label>
        <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep ring-1 ring-emerald/20 transition hover:bg-emerald/5">
          Save total
        </button>
      </ActionForm>

      {/* When the balance falls due. Without it nothing can distinguish a family
          who is late from one whose fee is not payable yet, and the only
          available action becomes messaging all of them on the same day. */}
      <ActionForm action={setFeeDueDate} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={studentId} />
        <label className="block">
          <span className={label}>Balance due on</span>
          <input type="date" name="dueDate" defaultValue={dayInput(fees.dueDateMs)} className={`${field} w-44`} />
        </label>
        <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep ring-1 ring-emerald/20 transition hover:bg-emerald/5">
          Save due date
        </button>
        {fees.dueDateMs && (
          <button
            type="submit"
            name="dueDate"
            value="clear"
            className="rounded-full px-3 py-2 text-sm font-semibold text-ink/50 transition hover:text-ink"
          >
            Clear
          </button>
        )}
      </ActionForm>

      {/* "I'll pay by Friday" is the commonest reply to a fee reminder, and on
          paper it is forgotten by the time Friday arrives. That forgotten
          callback is where most uncollected fees are actually lost. Logging it
          silences the chase until the date passes, then puts the family at the
          top of the collection list the morning after. */}
      <ActionForm action={logFeePromise} className="mt-3 rounded-xl border border-emerald/15 bg-cream/30 p-4">
        <input type="hidden" name="id" value={studentId} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
          Parent promised to pay
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[11rem_1fr]">
          <label className="block">
            <span className={label}>By</span>
            <input type="date" name="promisedDate" defaultValue={dayInput(fees.promisedDateMs)} className={field} />
          </label>
          <label className="block">
            <span className={label}>What they said</span>
            <input
              name="promiseNote"
              defaultValue={fees.promiseNote ?? ""}
              placeholder="After salary comes in, before the 5th"
              className={field}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep ring-1 ring-emerald/20 transition hover:bg-emerald/5">
            <Icon name="handshake" className="text-[18px]" /> Log promise
          </button>
          {fees.promisedDateMs && (
            <button
              type="submit"
              name="promisedDate"
              value="clear"
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink/50 transition hover:text-ink"
            >
              Clear promise
            </button>
          )}
          {fees.lastRemindedMs && (
            <span className="text-[11px] text-ink/45">Last reminded {fmtDate(fees.lastRemindedMs)}</span>
          )}
        </div>
      </ActionForm>

      <ActionForm action={recordPayment} className="mt-5 rounded-xl border border-emerald/15 bg-cream/30 p-4">
        <input type="hidden" name="studentId" value={studentId} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Record a payment</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={label}>Amount (₹)</span>
            <input name="amount" inputMode="decimal" required placeholder="5000" className={field} />
          </label>
          <label className="block">
            <span className={label}>Method</span>
            <select name="method" className={field}>
              {methods.map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Received on</span>
            <input type="date" name="receivedAt" defaultValue={todayInput()} className={field} />
          </label>
          <label className="block">
            <span className={label}>Reference</span>
            <input name="reference" placeholder="UPI ref / cheque no." className={field} />
          </label>
        </div>
        <button
          type="submit"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
        >
          <Icon name="add" className="text-[18px]" /> Record payment
        </button>
        <p className="mt-2 text-[11px] text-ink/45">
          Payments can&apos;t be edited or deleted. To correct one, record a negative amount.
        </p>
      </ActionForm>

      {payments.length > 0 && (
        <div className="mt-5 -mx-2 overflow-x-auto px-2">
        <table className="w-full min-w-[22rem] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-ink/45">
            <tr>
              <th className="pb-2 font-semibold">Receipt</th>
              <th className="pb-2 font-semibold">Date</th>
              <th className="hidden pb-2 font-semibold sm:table-cell">Method</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald/5">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="py-2.5 tabular-nums text-ink/60">
                  {p.receiptNumber}
                  {p.reference && <span className="ml-2 text-xs text-ink/40">{p.reference}</span>}
                </td>
                <td className="py-2.5 text-ink/70">{fmtDate(p.receivedAtMs)}</td>
                <td className="hidden py-2.5 text-ink/70 sm:table-cell">{p.method}</td>
                <td className={`py-2.5 text-right tabular-nums font-semibold ${p.amountPaise < 0 ? "text-red-700" : "text-emerald-deep"}`}>
                  {formatPaise(p.amountPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <p className="mt-4 border-t border-emerald/10 pt-3 text-[11px] text-ink/45">
        Showing the most recent {payments.length} {payments.length === 1 ? "payment" : "payments"}.{" "}
        <Link href="/admin/fees" className="font-semibold text-emerald hover:text-emerald-deep">
          Go to fee collection
        </Link>
      </p>
    </section>
  );
}
