"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-sm font-semibold text-emerald-deep";

type Status = "idle" | "submitting" | "success" | "error";

export function InquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Please check the form and try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again or call us.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div data-testid="inquiry-success" className="flex flex-col items-start gap-3 rounded-2xl border border-emerald/15 bg-emerald/5 p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-cream">
          <Icon name="check" className="text-[26px]" />
        </span>
        <h3 className="text-xl text-emerald-deep">Thank you — we&apos;ve received your inquiry</h3>
        <p className="text-ink/70">Our admissions team will be in touch shortly, in shaa Allah.</p>
      </div>
    );
  }

  const busy = status === "submitting";
  return (
    <form data-testid="inquiry-form" className="space-y-5" onSubmit={onSubmit} noValidate>
      {/* Honeypot — visually hidden, must stay empty */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

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

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-7 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep focus-visible:outline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit inquiry"}
        {!busy && <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
