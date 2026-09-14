"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

function Mark() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <rect width="48" height="48" rx="15" fill="#065f46" />
      <path d="M24 10c-6 4-9 9-9 15a9 9 0 0018 0c0-6-3-11-9-15z" fill="#c9a227" />
      <circle cx="24" cy="24" r="3.2" fill="#faf7f0" />
      <path d="M16 34h16" stroke="#faf7f0" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Header({ name, branch }: { name: string; branch: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Announcement bar — the one thing every visiting parent is here to
          find out, above everything else.

          On a phone the full sentence wraps to three lines and eats the top of
          the screen, so below `sm` it becomes a single-line ticker; from `sm`
          up there is room to simply centre it. This is the one place on the
          site where automatic motion is appropriate: it is a short, repeated
          notice rather than something a parent has to sit and read. */}
      <div className="ticker overflow-hidden bg-emerald-deep py-2 font-display text-sm font-semibold text-cream">
        <div className="ticker-track flex w-max sm:w-full sm:justify-center">
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap px-4">
            {site.announcement.before}
            <span className="text-gold-light">{site.announcement.highlight}</span>
            {site.announcement.after}
          </span>
          {/* Second copy exists only to make the loop seamless, so it is hidden
              from assistive tech and removed once the animation is off. */}
          <span aria-hidden className="ticker-dupe flex shrink-0 items-center gap-1 whitespace-nowrap px-4 sm:hidden">
            {site.announcement.before}
            <span className="text-gold-light">{site.announcement.highlight}</span>
            {site.announcement.after}
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur">
        <Container className="flex h-[4.5rem] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="leading-none">
              <span className="block font-display text-xl font-extrabold text-emerald">{name}</span>
              <span className="mt-1 block text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-ink/50">
                {branch}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            {site.nav.map((n) => (
              <Link key={n.href} href={n.href} className="font-semibold text-ink transition hover:text-emerald">
                {n.label}
              </Link>
            ))}
            <Button href="/admissions#enroll">{site.ctaLabel}</Button>
          </nav>

          <button
            type="button"
            className="flex flex-col gap-[5px] p-2 lg:hidden"
            aria-controls="mobile-nav"
            aria-expanded={open}
            aria-label={open ? "Close" : "Menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block h-[3px] w-[26px] rounded bg-ink" />
            <span className="block h-[3px] w-[26px] rounded bg-ink" />
            <span className="block h-[3px] w-[26px] rounded bg-ink" />
          </button>
        </Container>

        {open && (
          <nav id="mobile-nav" className="border-t border-emerald/10 bg-cream lg:hidden" aria-label="Mobile">
            <Container className="flex flex-col py-2">
              {site.nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="border-b border-ink/5 py-3 font-semibold text-ink"
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </Link>
              ))}
              <Button href="/admissions#enroll" className="mt-4 w-full">{site.ctaLabel}</Button>
            </Container>
          </nav>
        )}
      </header>
    </>
  );
}
