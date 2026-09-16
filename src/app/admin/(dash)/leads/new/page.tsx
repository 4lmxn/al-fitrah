import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SOURCE_LABEL } from "@/lib/leads";
import { getManualLeadSources, getPrograms } from "@/lib/taxonomy";
import { AGE_BANDS } from "@/lib/leadSchema";
import { createLead } from "./actions";
import { CARD } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-ink/50";

const AGE_LABELS: Record<string, string> = {
  below: "Below 2y 10m",
  eligible: "2y 10m – 3y 10m (eligible)",
  above: "Above 3y 10m",
};

export default async function NewLeadPage() {
  const [manualSources, programs] = await Promise.all([getManualLeadSources(), getPrograms()]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to leads
      </Link>
      <h1 className="mt-4 font-display text-3xl text-emerald-deep">Add a lead</h1>
      <p className="mt-1 text-sm text-ink/55">Log a walk-in, phone, or referral enquiry — it joins the same pipeline.</p>

      <form action={createLead} className={`${CARD} mt-7 space-y-5 p-6 sm:p-8`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="parentName">Parent&apos;s name *</label>
            <input id="parentName" name="parentName" required maxLength={80} placeholder="e.g. Ayesha Khan" className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="childName">Child&apos;s name</label>
            <input id="childName" name="childName" maxLength={80} placeholder="e.g. Yusuf" className={field} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="phone">Phone *</label>
            <input id="phone" name="phone" type="tel" required placeholder="+91 xxxxx xxxxx" className={field} />
            <label className="flex items-center gap-2 pt-0.5 text-sm text-ink/70">
              <input type="checkbox" name="whatsapp" defaultChecked className="h-4 w-4 rounded accent-emerald" />
              On WhatsApp
            </label>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" maxLength={120} placeholder="you@example.com" className={field} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="source">Source</label>
            <select id="source" name="source" defaultValue="walk-in" className={`${field} cursor-pointer`}>
              {manualSources.map((s: string) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="programInterest">Program</label>
            <select id="programInterest" name="programInterest" defaultValue="" className={`${field} cursor-pointer`}>
              <option value="">—</option>
              {programs.map((p: string) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls} htmlFor="childAge">Child age</label>
            <select id="childAge" name="childAge" defaultValue="" className={`${field} cursor-pointer`}>
              <option value="">—</option>
              {AGE_BANDS.map((b) => (
                <option key={b} value={b}>{AGE_LABELS[b]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls} htmlFor="referredBy">Referred by <span className="font-normal normal-case text-ink/40">(code or name, optional)</span></label>
          <input id="referredBy" name="referredBy" maxLength={60} placeholder="e.g. ayesha-0718" className={field} />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls} htmlFor="note">First note <span className="font-normal normal-case text-ink/40">(what did they ask?)</span></label>
          <textarea id="note" name="note" rows={3} maxLength={2000} placeholder="e.g. Walked in, asked about Pre-KG fees and timings." className={`${field} resize-none`} />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
            <Icon name="person_add" className="text-[18px]" /> Add lead
          </button>
          <Link href="/admin" className="text-sm font-semibold text-ink/55 hover:text-ink">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
