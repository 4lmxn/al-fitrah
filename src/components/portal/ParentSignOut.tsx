"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ParentSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/parent-session", { method: "DELETE" }).catch(() => {});
        router.replace("/portal/sign-in");
      }}
      className="rounded-full px-3 py-1.5 text-xs font-semibold text-cream/80 ring-1 ring-inset ring-cream/20 transition hover:bg-cream/10 disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
