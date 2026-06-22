// src/components/layout/Header.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-emerald/10 bg-cream/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-lg font-semibold text-emerald">
          {site.name}
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-ink/70 hover:text-emerald">
              {n.label}
            </Link>
          ))}
          <Button href="/admissions#enroll">{site.ctaLabel}</Button>
        </nav>
        <button
          type="button"
          className="md:hidden text-emerald"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </Container>
      {open && (
        <nav className="md:hidden border-t border-emerald/10 bg-cream" aria-label="Mobile">
          <Container className="flex flex-col gap-3 py-4">
            {site.nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-ink/80" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <Button href="/admissions#enroll" className="mt-2">{site.ctaLabel}</Button>
          </Container>
        </nav>
      )}
    </header>
  );
}
