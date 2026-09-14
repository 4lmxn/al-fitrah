"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";

const FALLBACK_PHONE = "+919986500718";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("client boundary caught", error);
  }, [error]);

  return (
    <main className="py-24 sm:py-32">
      <Container className="max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-deep ring-1 ring-gold/30">
          <Icon name="error" className="text-base" />
          Something broke
        </span>
        <h1 className="mt-6 text-4xl sm:text-5xl">We hit an unexpected error.</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/70">
          Please try again. If it keeps happening, call us — we are happy to help over the phone.
        </p>
        {error.digest && <p className="mt-3 text-xs text-ink/40">Reference: {error.digest}</p>}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex items-center justify-center rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-dark focus-visible:outline"
          >
            Try again
          </button>
          <Link href="/" className="text-sm font-semibold text-emerald-deep">Back to home</Link>
          <a href={`tel:${FALLBACK_PHONE}`} className="text-sm font-semibold text-emerald-deep">
            Call {FALLBACK_PHONE}
          </a>
        </div>
      </Container>
    </main>
  );
}
