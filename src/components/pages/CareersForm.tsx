"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MAX_CV_BYTES, ACCEPTED_CV_TYPES } from "@/lib/applicationSchema";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-sm font-semibold text-emerald-deep";

type Status = "idle" | "submitting" | "success" | "error";

export function CareersForm({ roles }: { roles: string[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const cv = fd.get("cv");
    if (!(cv instanceof File) || cv.size === 0) {
      setError("Please attach your CV (PDF, DOC, or DOCX).");
      setStatus("error");
      return;
    }
    if (cv.size > MAX_CV_BYTES) {
      setError("CV must be 5 MB or smaller.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/application", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Please check the form and try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again or email us.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div data-testid="careers-success" className="flex flex-col items-start gap-3 rounded-2xl border border-emerald/15 bg-emerald/5 p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-cream">
          <Icon name="check" className="text-[26px]" />
        </span>
        <h3 className="text-xl text-emerald-deep">Thank you — we&apos;ve received your application</h3>
        <p className="text-ink/70">Our team will review it and be in touch if there&apos;s a fit, in shaa Allah.</p>
      </div>
    );
  }

  const busy = status === "submitting";
  return (
    <form data-testid="careers-form" className="space-y-5" onSubmit={onSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="name">Full name *</label>
          <input id="name" name="name" required placeholder="e.g. Fatima Noor" className={field} />
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
          <label className={labelCls} htmlFor="role">Role *</label>
          <select id="role" name="role" required defaultValue="" className={`${field} cursor-pointer`}>
            <option value="" disabled>Select a role</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="Other">Other / general application</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="message">Cover note</label>
        <textarea id="message" name="message" rows={4} placeholder="Tell us about your experience" className={`${field} resize-none`} />
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="cv">CV / Resume * <span className="font-normal text-ink/50">(PDF, DOC, DOCX — max 5 MB)</span></label>
        <input id="cv" name="cv" type="file" required accept={ACCEPTED_CV_TYPES.join(",")} className={`${field} cursor-pointer file:mr-3 file:rounded-full file:border-0 file:bg-emerald file:px-4 file:py-1.5 file:text-cream`} />
      </div>

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-7 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep focus-visible:outline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit application"}
        {!busy && <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
