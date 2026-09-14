"use client";
import { useSyncExternalStore } from "react";
import Script from "next/script";

const STORAGE_KEY = "alfitrah.analytics-consent";

type Consent = "granted" | "denied" | "undecided" | "unknown";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Consent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : "undecided";
  } catch {
    return "undecided";
  }
}

const getServerSnapshot = (): Consent => "unknown";

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(next: "granted" | "denied") {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Can't persist — the choice still applies for this page view.
    }
    for (const l of listeners) l();
  }

  if (!gaId || consent === "unknown") return null;

  if (consent === "undecided") {
    return (
      <div
        role="dialog"
        aria-label="Analytics consent"
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-emerald/15 bg-white/95 p-4 shadow-lift backdrop-blur sm:inset-x-auto sm:bottom-4 sm:right-4"
      >
        <p className="text-sm text-ink/75">
          We&apos;d like to measure how families find this site, using Google Analytics. Nothing is
          measured unless you agree, and we never use it to advertise to children.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-cream transition hover:bg-emerald-deep"
          >
            Allow
          </button>
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-full px-4 py-2 text-xs font-semibold text-emerald-deep ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5"
          >
            No thanks
          </button>
        </div>
      </div>
    );
  }

  if (consent === "denied") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // Measurement only: no ad signals, no cross-site identifiers. DPDP
          // bars targeted advertising directed at children, and this site is
          // about children by definition.
          gtag('config', '${gaId}', { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
        `}
      </Script>
    </>
  );
}
