"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MAX_CV_BYTES, ACCEPTED_CV_TYPES } from "@/lib/applicationSchema";

const field =
  "w-full rounded-2xl border-2 border-emerald/15 bg-cream/50 px-4 py-3 text-ink outline-none transition focus:border-emerald placeholder:text-ink/50";
const labelCls = "block font-display text-sm font-semibold text-emerald-deep";

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = Record<string, string[]>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return <p id={id} className="text-sm text-red-700">{errors[0]}</p>;
}

export function CareersForm({ roles }: { roles: string[] }) {
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
    setError("");
    setFieldErrors({});
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
    // Abort if the server hangs so the button can't stay stuck in "Submitting…".
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("/api/application", { method: "POST", body: fd, signal: controller.signal });
      // Guard non-JSON bodies (e.g. a gateway's HTML error page).
      let data: { ok?: boolean; error?: string; issues?: FieldErrors } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.ok) {
        setFieldErrors(data.issues ?? {});
        setError(data.error || "Something went wrong. Please try again or email us.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again or email us.");
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" data-testid="careers-success" className="flex flex-col items-start gap-3 rounded-2xl border border-emerald/15 bg-emerald/5 p-6 outline-none">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-cream">
          <Icon name="check" className="text-[26px]" />
        </span>
        <h3 className="text-xl text-emerald-deep">Thank you, we&apos;ve received your application</h3>
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
          <input id="name" name="name" required placeholder="e.g. Fatima Noor" className={field} {...invalidProps("name")} />
          <FieldError id="name-error" errors={fieldErrors.name} />
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
          <label className={labelCls} htmlFor="role">Role *</label>
          <select id="role" name="role" required defaultValue="" className={`${field} cursor-pointer`} {...invalidProps("role")}>
            <option value="" disabled>Select a role</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="Other">Other / general application</option>
          </select>
          <FieldError id="role-error" errors={fieldErrors.role} />
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="portfolioUrl">Portfolio or LinkedIn <span className="font-normal text-ink/45">(optional)</span></label>
        <input id="portfolioUrl" name="portfolioUrl" type="url" placeholder="https://" className={field} {...invalidProps("portfolioUrl")} />
        <FieldError id="portfolioUrl-error" errors={fieldErrors.portfolioUrl} />
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="message">Cover note</label>
        <textarea id="message" name="message" rows={4} placeholder="Tell us about your experience" className={`${field} resize-none`} {...invalidProps("message")} />
        <FieldError id="message-error" errors={fieldErrors.message} />
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="cv">CV / Resume * <span className="font-normal text-ink/50">(PDF, DOC, DOCX, max 5 MB)</span></label>
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
