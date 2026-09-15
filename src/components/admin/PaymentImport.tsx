"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import {
  commitPayments,
  previewPayments,
  type ImportOutcome,
} from "@/app/admin/(dash)/fees/import/actions";
import { guessMapping, headersOf, type ColumnMap } from "@/lib/paymentImport";
import { formatPaise } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/70";

const FIELDS: { key: keyof ColumnMap; title: string; hint: string; required: boolean }[] = [
  { key: "reference", title: "Reference number", hint: "What makes a payment unique. Without it a re-upload would pay twice.", required: true },
  { key: "admissionNumber", title: "Admission number", hint: "How a payment is matched to a child.", required: true },
  { key: "amount", title: "Amount", hint: "In rupees.", required: true },
  { key: "paidAt", title: "Date paid", hint: "Optional. Today's date is used if absent.", required: false },
  { key: "studentName", title: "Student name", hint: "Optional. Shown while checking, never used to match.", required: false },
];

export function PaymentImport() {
  const [csv, setCsv] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Partial<ColumnMap>>({});

  const [state, formAction, pending] = useActionState(
    async (_prev: ImportOutcome | null, formData: FormData) =>
      formData.get("commit") === "true" ? commitPayments(formData) : previewPayments(formData),
    null,
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    applyText(text);
  }

  function applyText(text: string) {
    setCsv(text);
    const found = headersOf(text);
    setHeaders(found);
    setMap(guessMapping(found));
  }

  const ready = state?.ok ? state.counts.ready : 0;
  const committed = state?.ok && state.committed;

  if (committed) {
    return (
      <div className="rounded-2xl border border-emerald/15 bg-emerald/5 p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-cream">
          <Icon name="check" className="text-[26px]" />
        </span>
        <h2 className="mt-4 font-display text-2xl text-emerald-deep">
          {state.written} {state.written === 1 ? "payment" : "payments"} recorded
        </h2>
        <p className="mt-2 text-sm text-ink/70">
          {formatPaise(state.counts.totalPaise)} credited.
          {state.counts.duplicates > 0 && ` ${state.counts.duplicates} already recorded, skipped.`}
          {state.counts.unmatched > 0 && ` ${state.counts.unmatched} could not be matched to a child.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/fees" className="min-h-11 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
            Back to fees
          </Link>
          <Link href="/admin/fees/import" className="min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold text-emerald-deep ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5">
            Import another report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="csv" value={csv} />

      <div className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
        <label className="block">
          <span className={label}>SBI Collect report (CSV)</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-emerald file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-cream"
          />
        </label>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink/70">or paste it</p>
        <textarea
          rows={5}
          value={csv}
          onChange={(e) => applyText(e.target.value)}
          className="mt-1 w-full resize-y rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
        />
      </div>

      {headers.length > 0 && (
        <div className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">
            Which column is which?
          </h2>
          <p className="mt-1 text-sm text-ink/70">
            Checked once. The bank names these columns differently from time to time, so confirm them
            rather than trusting the guess.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className={label}>
                  {f.title} {f.required ? "" : <span className="normal-case text-ink/45">(optional)</span>}
                </span>
                <select
                  name={`col_${f.key}`}
                  value={map[f.key] ?? ""}
                  onChange={(e) => setMap({ ...map, [f.key]: e.target.value })}
                  className={field}
                >
                  <option value="">— not in this file —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-ink/60">{f.hint}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {state && !state.ok && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">{state.error}</p>
          {state.issues.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto text-sm text-red-700">
              {state.issues.map((i) => (
                <li key={`${i.rowNumber}-${i.message}`}>
                  {i.rowNumber > 0 ? `Row ${i.rowNumber}: ` : ""}{i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state?.ok && !state.committed && (
        <div className="space-y-4">
          <div className="grid gap-px overflow-hidden rounded-2xl bg-emerald/10 sm:grid-cols-4">
            <Stat label="Will be recorded" value={String(state.counts.ready)} tone="good" />
            <Stat label="Total" value={formatPaise(state.counts.totalPaise)} tone="good" />
            <Stat label="Already recorded" value={String(state.counts.duplicates)} />
            <Stat label="No matching child" value={String(state.counts.unmatched)} tone={state.counts.unmatched > 0 ? "warn" : undefined} />
          </div>

          {state.counts.unmatched > 0 && (
            <p className="rounded-xl border border-gold/30 bg-gold-soft/40 px-4 py-3 text-sm text-ink/75">
              Rows with no matching child are <strong>not</strong> imported. Check the admission number
              on the report against the roll, correct it, and import again — or record those payments by
              hand on the child&apos;s record.
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-emerald/15 bg-white/90 shadow-soft">
            <div className="max-h-96 overflow-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="sticky top-0 bg-cream/60 text-[11px] uppercase tracking-wide text-ink/70">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Row</th>
                    <th className="px-4 py-2 font-semibold">Reference</th>
                    <th className="px-4 py-2 font-semibold">Admission no.</th>
                    <th className="px-4 py-2 font-semibold">Child</th>
                    <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    <th className="px-4 py-2 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald/5">
                  {state.resolutions.map((r) => (
                    <tr key={r.row.reference}>
                      <td className="px-4 py-2 tabular-nums text-ink/55">{r.row.rowNumber}</td>
                      <td className="px-4 py-2 font-mono text-xs text-ink/70">{r.row.reference}</td>
                      <td className="px-4 py-2 tabular-nums text-ink/70">{r.row.admissionNumber}</td>
                      <td className="px-4 py-2 text-ink/70">
                        {r.kind === "ready" ? r.studentName : (r.row.studentName ?? "—")}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-emerald-deep">
                        {formatPaise(r.row.amountPaise)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            r.kind === "ready"
                              ? "bg-emerald/10 text-emerald-deep"
                              : r.kind === "duplicate"
                                ? "bg-ink/5 text-ink/60"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200"
                          }`}
                        >
                          {r.kind === "ready" ? "Will record" : r.kind === "duplicate" ? "Already recorded" : "No matching child"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !csv.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-deep ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5 disabled:opacity-60"
        >
          <Icon name="search" className="text-[18px]" /> {pending ? "Checking…" : "Check the report"}
        </button>
        {ready > 0 && (
          <button
            type="submit"
            name="commit"
            value="true"
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:opacity-60"
          >
            <Icon name="payments" className="text-[18px]" />
            Record {ready} {ready === 1 ? "payment" : "payments"}
          </button>
        )}
      </div>
    </form>
  );
}

function Stat({ label: title, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/70">{title}</p>
      <p
        className={`mt-1 font-display text-xl tabular-nums ${
          tone === "good" ? "text-emerald-deep" : tone === "warn" ? "text-red-700" : "text-ink/70"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
