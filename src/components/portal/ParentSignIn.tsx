"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendParentOtp } from "@/lib/firebaseClient";
import type { ConfirmationResult } from "firebase/auth";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";

export function ParentSignIn() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) throw new Error("Enter your 10-digit mobile number.");
      const result = await sendParentOtp(`+91${digits.slice(-10)}`, "recaptcha");
      setConfirmation(result);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send a code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      const credential = await confirmation.confirm(code);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/parent-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "That code didn't work. Please try again.");
        setBusy(false);
        return;
      }
      router.replace("/portal");
    } catch {
      setError("That code didn't work. Please check it and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      {step === "phone" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-emerald-deep">Mobile number</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              className={field}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-emerald-deep">Six-digit code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={`${field} tracking-[0.4em]`}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:opacity-60"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setError(""); }}
            className="w-full text-xs font-semibold text-ink/50 hover:text-ink"
          >
            Use a different number
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Firebase attaches its invisible reCAPTCHA here; without it no code is sent. */}
      <div id="recaptcha" />

      <p className="mt-6 text-center text-xs leading-relaxed text-ink/45">
        Only numbers the school holds against a student can sign in. If yours isn&apos;t recognised,
        please contact the office.
      </p>
    </>
  );
}
