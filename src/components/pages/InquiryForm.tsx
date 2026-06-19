"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

// Presentational only — submission is wired to a Cloud Function in a later plan.
const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-sm font-semibold text-emerald-deep";

export function InquiryForm() {
  const [done, setDone] = useState(false);
  return (
    <form
      data-testid="inquiry-form"
      className="space-y-5"
      onSubmit={(e) => { e.preventDefault(); setDone(true); }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="parentName">Parent&apos;s name *</label>
          <input id="parentName" name="parentName" required placeholder="e.g. Ayesha Khan" className={field} />
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="phone">Phone number *</label>
          <input id="phone" name="phone" type="tel" required placeholder="+91  xxxxx xxxxx" className={field} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" className={field} />
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="childAge">Child&apos;s age *</label>
          <select id="childAge" name="childAge" required defaultValue="" className={`${field} cursor-pointer`}>
            <option value="" disabled>Select age</option>
            <option value="2-3">2 – 3 years (Playgroup)</option>
            <option value="3-4">3 – 4 years (Nursery)</option>
            <option value="4-5">4 – 5 years (LKG)</option>
            <option value="5-6">5 – 6 years (UKG)</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="message">Message / any questions?</label>
        <textarea id="message" name="message" rows={4} placeholder="How can we help you?" className={`${field} resize-none`} />
      </div>
      <button
        type="submit"
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-7 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep focus-visible:outline"
      >
        {done ? "Thank you — we'll be in touch" : "Submit inquiry"}
        {!done && <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
