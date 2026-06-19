// src/components/layout/Footer.tsx
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-emerald/10 bg-emerald text-cream">
      <Container className="grid gap-8 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg">{site.name}</p>
          <p className="mt-2 text-sm text-cream/70">{site.tagline}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-cream/70">
            {site.nav.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-cream">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="text-sm text-cream/70">
          <p className="font-semibold text-cream">Contact</p>
          <p className="mt-3">{site.contact.address}</p>
          <p>{site.contact.phone}</p>
          <p>{site.contact.email}</p>
        </div>
      </Container>
      <Container className="border-t border-cream/10 py-5 text-xs text-cream/50">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </Container>
    </footer>
  );
}
