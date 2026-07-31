"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AGE_BANDS } from "@/lib/leadSchema";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-sm font-semibold text-emerald-deep";

const AGE_BAND_LABELS: Record<(typeof AGE_BANDS)[number], string> = {
  below: "Below 2 years 10 months",
  eligible: "2y 10m – 3y 10m (Pre-KG eligible)",
  above: "Above 3 years 10 months",
};

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = Record<string, string[]>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return <p id={id} className="text-sm text-red-700">{errors[0]}</p>;
}

export function InquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const invalidProps = (name: string) =>
    fieldErrors[name]?.length
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {};

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    // Abort if the server hangs so the button can't stay stuck in "Submitting…".
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      // Guard non-JSON bodies (e.g. a gateway's HTML error page).
      let data: { ok?: boolean; error?: string; issues?: FieldErrors } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.ok) {
        setFieldErrors(data.issues ?? {});
        setError(data.error || "Something went wrong. Please try again or call us.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again or call us.");
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" data-testid="inquiry-success" className="flex flex-col items-start gap-3 rounded-2xl border border-emerald/15 bg-emerald/5 p-6 outline-none">
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
          <input id="parentName" name="parentName" required placeholder="e.g. Ayesha Khan" className={field} {...invalidProps("parentName")} />
          <FieldError id="parentName-error" errors={fieldErrors.parentName} />
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="phone">Phone number *</label>
          <input id="phone" name="phone" type="tel" required placeholder="+91  xxxxx xxxxx" className={field} {...invalidProps("phone")} />
          <FieldError id="phone-error" errors={fieldErrors.phone} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" className={field} {...invalidProps("email")} />
          <FieldError id="email-error" errors={fieldErrors.email} />
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="childAge">Child&apos;s age (entry at Pre-KG) *</label>
          <select id="childAge" name="childAge" required defaultValue="" className={`${field} cursor-pointer`} {...invalidProps("childAge")}>
            <option value="" disabled>Select age</option>
            {AGE_BANDS.map((band) => (
              <option key={band} value={band}>{AGE_BAND_LABELS[band]}</option>
            ))}
          </select>
          <FieldError id="childAge-error" errors={fieldErrors.childAge} />
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="message">Message / any questions?</label>
        <textarea id="message" name="message" rows={4} placeholder="How can we help you?" className={`${field} resize-none`} {...invalidProps("message")} />
        <FieldError id="message-error" errors={fieldErrors.message} />
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

      <p className="text-xs leading-relaxed text-ink/50">
        We use your details only to respond to your enquiry. See our{" "}
        <Link href="/privacy" className="font-medium text-emerald underline underline-offset-2 hover:text-emerald-deep">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
