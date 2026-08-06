"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeParentEmailLink, sendParentEmailLink, sendParentOtp } from "@/lib/firebaseClient";
import type { ConfirmationResult } from "firebase/auth";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const primary =
  "w-full rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:opacity-60";

type Mode = "email" | "email-sent" | "phone" | "phone-code" | "finishing";

export function ParentSignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A parent arriving back on this page from an email link completes sign-in
  // without touching anything — the link IS the credential.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idToken = await completeParentEmailLink();
        if (!idToken || cancelled) return;
        setMode("finishing");
        await exchange(idToken);
      } catch {
        if (!cancelled) setError("That link has expired. Please request a new one.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exchange(idToken: string) {
    const res = await fetch("/api/auth/parent-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setError(data.error || "We couldn't sign you in. Please contact the school office.");
      setMode("email");
      setBusy(false);
      return;
    }
    router.replace("/portal");
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendParentEmailLink(email.trim());
      setMode("email-sent");
    } catch {
      setError("We couldn't send that link. Please check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) throw new Error("Enter your 10-digit mobile number.");
      setConfirmation(await sendParentOtp(`+91${digits.slice(-10)}`, "recaptcha"));
      setMode("phone-code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send a code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      const credential = await confirmation.confirm(code);
      await exchange(await credential.user.getIdToken());
    } catch {
      setError("That code didn't work. Please check it and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      {mode === "finishing" && <p className="mt-6 text-center text-sm text-ink/60">Signing you in…</p>}

      {mode === "email" && (
        <form onSubmit={requestLink} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-emerald-deep">Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={field}
            />
          </label>
          <button type="submit" disabled={busy} className={primary}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("phone"); setError(""); }}
            className="w-full text-xs font-semibold text-emerald hover:text-emerald-deep"
          >
            The school doesn&apos;t have my email — use my mobile instead
          </button>
        </form>
      )}

      {mode === "email-sent" && (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-ink/70">
            We&apos;ve sent a sign-in link to <b className="text-emerald-deep">{email}</b>. Open it on
            this device to continue.
          </p>
          <button
            type="button"
            onClick={() => { setMode("email"); setError(""); }}
            className="text-xs font-semibold text-ink/50 hover:text-ink"
          >
            Use a different address
          </button>
        </div>
      )}

      {mode === "phone" && (
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
          <button type="submit" disabled={busy} className={primary}>
            {busy ? "Sending…" : "Send code"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("email"); setError(""); }}
            className="w-full text-xs font-semibold text-emerald hover:text-emerald-deep"
          >
            Use email instead
          </button>
        </form>
      )}

      {mode === "phone-code" && (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
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
          <button type="submit" disabled={busy} className={primary}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("phone"); setError(""); }}
            className="w-full text-xs font-semibold text-ink/50 hover:text-ink"
          >
            Use a different number
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Firebase attaches its invisible reCAPTCHA here before sending a code. */}
      <div id="recaptcha" />

      <p className="mt-6 text-center text-xs leading-relaxed text-ink/45">
        Only an email or mobile number the school holds against a student can sign in. If yours
        isn&apos;t recognised, please contact the office.
      </p>
    </>
  );
}
