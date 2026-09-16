import Link from "next/link";
import { listStructures } from "@/lib/feeStructures";
import { getClassSections, getPrograms } from "@/lib/taxonomy";
import { academicYearFor } from "@/lib/students";
import { formatPaise } from "@/lib/money";
import { requireAdmin } from "@/lib/adminAuth";
import { ActionForm } from "@/components/admin/ActionForm";
import { Icon } from "@/components/ui/Icon";
import { applyToClass, createStructure, deleteStructure, updateStructure } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

export default async function FeeStructuresPage() {
  const [admin, structures, programs, sections] = await Promise.all([
    requireAdmin(),
    listStructures(),
    getPrograms(),
    getClassSections(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/fees"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Back to fees
      </Link>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Finance</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Fee structures</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/55">
          What a year of school costs, defined once. Apply one to a class instead of typing the
          same amount onto every child&apos;s record.
        </p>
      </div>

      <section className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="add" className="text-[18px] text-gold" /> New fee
        </h2>
        <ActionForm action={createStructure} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={label}>Name</span>
              <input name="name" required placeholder="Nursery — annual" className={field} />
            </label>
            <label className="block">
              <span className={label}>Amount for the year (₹)</span>
              <input name="amount" inputMode="decimal" required placeholder="25000" className={field} />
            </label>
            <label className="block">
              <span className={label}>Academic year</span>
              <input name="academicYear" defaultValue={academicYearFor()} className={field} />
            </label>
            <label className="block">
              <span className={label}>Program</span>
              <select name="program" className={field} defaultValue="">
                <option value="">Any program</option>
                {programs.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink/70">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-emerald" />
              In use this year
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
          >
            <Icon name="add" className="text-[18px]" /> Add fee
          </button>
        </ActionForm>
      </section>

      {structures.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-emerald/10 bg-white/90 p-16 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
            <Icon name="payments" className="text-[30px]" />
          </span>
          <p className="font-display text-lg text-emerald-deep">No fees defined yet</p>
          <p className="max-w-sm text-sm text-ink/50">
            Add one above, then apply it to a class. Totals set by hand on a child&apos;s record keep
            working either way.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {structures.map((s) => (
            <section key={s.id} className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-emerald-deep">{s.name}</h3>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {s.academicYear} · {s.program ?? "Any program"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl tabular-nums text-emerald-deep">
                    {formatPaise(s.amountPaise)}
                  </span>
                  {!s.active && (
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/50">
                      Not in use
                    </span>
                  )}
                </div>
              </div>

              <ActionForm action={updateStructure} className="mt-4 grid gap-3 sm:grid-cols-5">
                <input type="hidden" name="id" value={s.id} />
                <label className="block sm:col-span-2">
                  <span className={label}>Name</span>
                  <input name="name" defaultValue={s.name} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Amount (₹)</span>
                  <input
                    name="amount"
                    inputMode="decimal"
                    defaultValue={(s.amountPaise / 100).toFixed(2)}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Year</span>
                  <input name="academicYear" defaultValue={s.academicYear} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Program</span>
                  <select name="program" defaultValue={s.program ?? ""} className={field}>
                    <option value="">Any program</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-5">
                  <label className="flex items-center gap-2 text-sm text-ink/70">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={s.active}
                      className="h-4 w-4 accent-emerald"
                    />
                    In use this year
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep ring-1 ring-emerald/20 transition hover:bg-emerald/5"
                  >
                    Save changes
                  </button>
                  <span className="text-[11px] text-ink/45">
                    Changes the price list only. Children already on this fee keep their current
                    total until it is re-applied.
                  </span>
                </div>
              </ActionForm>

              <ActionForm
                action={applyToClass}
                className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-emerald/15 bg-cream/30 p-4"
              >
                <input type="hidden" name="structureId" value={s.id} />
                <label className="block">
                  <span className={label}>Apply to a class</span>
                  <select name="classSection" className={`${field} w-48`}>
                    {sections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
                >
                  Apply
                </button>
                <p className="w-full text-[11px] text-ink/45">
                  Sets the total for every enrolled child in that class who has no fee yet, and
                  re-applies it to those already on this one — keeping their concessions. A child
                  with a different amount set by hand is skipped.
                </p>
              </ActionForm>

              {admin.role === "owner" && (
                <ActionForm
                  action={deleteStructure}
                  className="mt-3"
                  confirm={`Delete the “${s.name}” fee from the price list? Children already on it keep their balance — this only stops it being applied to anyone new. This cannot be undone.`}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-red-700/80 underline-offset-2 transition hover:underline"
                  >
                    Delete this fee
                  </button>
                </ActionForm>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
