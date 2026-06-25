import Link from "next/link";
import { EMPLOYMENT_TYPES, type JobOpening } from "@/lib/jobOpenings";

const field =
  "w-full rounded-xl border border-emerald/15 bg-white px-4 py-2.5 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-sm font-semibold text-emerald-deep";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  opening?: JobOpening;
  submitLabel: string;
};

// Shared create/edit form. Requirements are entered one-per-line and stored as
// a string[]. Used by both the "new" and "edit" admin pages.
export function OpeningForm({ action, opening, submitLabel }: Props) {
  return (
    <form action={action} className="space-y-6">
      {opening && <input type="hidden" name="id" value={opening.id} />}

      <div className="space-y-2">
        <label className={labelCls} htmlFor="title">Job title *</label>
        <input id="title" name="title" required defaultValue={opening?.title} placeholder="e.g. Preschool Teacher" className={field} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="employmentType">Employment type</label>
          <select id="employmentType" name="employmentType" defaultValue={opening?.employmentType ?? "Full-time"} className={`${field} cursor-pointer`}>
            {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="order">Display order</label>
          <input id="order" name="order" type="number" defaultValue={opening?.order ?? 0} className={field} />
          <p className="text-xs text-ink/45">Lower numbers appear first.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="summary">Short summary</label>
        <textarea id="summary" name="summary" rows={2} defaultValue={opening?.summary} placeholder="One line about the role" className={`${field} resize-none`} />
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="requirements">Requirements <span className="font-normal text-ink/45">(one per line)</span></label>
        <textarea
          id="requirements"
          name="requirements"
          rows={6}
          defaultValue={opening?.requirements.join("\n")}
          placeholder={"Strong recitation skills with tajweed knowledge\nGood understanding of Islamic values\nExperience in early childhood education preferred"}
          className={`${field} resize-y`}
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-emerald/15 bg-white px-4 py-3">
        <input type="checkbox" name="active" defaultChecked={opening?.active ?? true} className="h-4 w-4 accent-emerald" />
        <span className="text-sm font-semibold text-emerald-deep">Active — show on the public careers page</span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className="inline-flex items-center justify-center rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
          {submitLabel}
        </button>
        <Link href="/admin/openings" className="rounded-full px-5 py-3 text-sm font-semibold text-ink/60 transition hover:bg-emerald/5">
          Cancel
        </Link>
      </div>
    </form>
  );
}
