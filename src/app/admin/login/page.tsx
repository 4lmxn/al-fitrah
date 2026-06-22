"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebaseClient";
import { Icon } from "@/components/ui/Icon";

export default function AdminLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSignIn() {
    setBusy(true);
    setError("");
    try {
      const idToken = await signInWithGoogle();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Sign-in failed. Please try again.");
        setBusy(false);
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Sign-in was cancelled or failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-cream-deep/40 px-6">
      <div className="w-full max-w-sm rounded-xl3 border border-emerald/10 bg-white/90 p-8 text-center shadow-lift">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald/8 text-emerald ring-1 ring-emerald/10">
          <Icon name="admin_panel_settings" className="text-[28px]" />
        </span>
        <h1 className="text-2xl text-emerald-deep">Admin access</h1>
        <p className="mt-2 text-sm text-ink/60">Sign in with an authorized Google account.</p>
        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          data-testid="google-signin"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="login" className="text-[18px]" />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
