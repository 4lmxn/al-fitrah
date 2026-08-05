"use client";
import { useEffect, useRef, useState } from "react";
import { SubmitErrorFallback } from "@/components/pages/SubmitErrorFallback";

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = Record<string, string[]>;

// Minimal name + phone capture shared by the waitlist and prospectus magnet.
// `source` selects which lead tag is stored; `onSuccess` lets the prospectus
// caller reveal its download once the lead lands.
export function CaptureForm({
  source,
  cta = "Register interest",
  successTitle = "You're on the list",
  successBody = "Thank you — our admissions team will be in touch soon, in shaa Allah.",
  onSuccess,
  dark = false,
}: {
  source: "waitlist" | "prospectus";
  cta?: string;
  successTitle?: string;
  successBody?: string;
  onSuccess?: () => void;
  dark?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success") {
      successRef.current?.focus();
      onSuccess?.();
    }
  }, [status, onSuccess]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const p = new URLSearchParams(window.location.search);
    const payload = {
      ...Object.fromEntries(fd.entries()),
      source,
      utmSource: p.get("utm_source") ?? "",
      utmMedium: p.get("utm_medium") ?? "",
      utmCampaign: p.get("utm_campaign") ?? "",
      referredBy: p.get("ref") ?? p.get("referredBy") ?? "",
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let data: { ok?: boolean; error?: string; issues?: FieldErrors } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.ok) {
        setFieldErrors(data.issues ?? {});
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error — that didn't send.");
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  const field = dark
    ? "w-full rounded-xl border border-cream/20 bg-cream/10 px-4 py-3 text-cream outline-none transition focus:border-gold placeholder:text-cream/40"
    : "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={`rounded-2xl p-5 outline-none ${dark ? "bg-cream/10 text-cream ring-1 ring-cream/15" : "border border-emerald/15 bg-emerald/5"}`}
      >
        <p className={`font-display text-lg ${dark ? "text-cream" : "text-emerald-deep"}`}>{successTitle}</p>
        <p className={`mt-1 text-sm ${dark ? "text-cream/80" : "text-ink/70"}`}>{successBody}</p>
      </div>
    );
  }

  const busy = status === "submitting";
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input name="parentName" required placeholder="Parent's name" aria-label="Parent's name" className={field} />
          {fieldErrors.parentName?.[0] && <p className="mt-1 text-xs text-red-500">{fieldErrors.parentName[0]}</p>}
        </div>
        <div>
          <input name="phone" type="tel" required placeholder="Phone number" aria-label="Phone number" className={field} />
          {fieldErrors.phone?.[0] && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone[0]}</p>}
        </div>
      </div>
      <label className={`flex items-center gap-2 text-sm ${dark ? "text-cream/80" : "text-ink/70"}`}>
        <input type="checkbox" name="whatsapp" defaultChecked className="h-4 w-4 rounded accent-emerald" />
        This number is on WhatsApp
      </label>
      {status === "error" && (
        <SubmitErrorFallback message={error} dark={dark} />
      )}
      <button
        type="submit"
        disabled={busy}
        className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
          dark ? "bg-gold text-ink hover:bg-gold-light" : "bg-emerald text-cream hover:bg-emerald-dark"
        }`}
      >
        {busy ? "Submitting…" : cta}
      </button>
    </form>
  );
}
