// src/components/layout/Footer.tsx
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-emerald/10 bg-emerald text-cream">
      <Container className="grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg">{site.name}</p>
          <p className="mt-2 text-sm text-cream/70">{site.tagline}</p>
        </div>
        <nav className="text-sm" aria-label="Footer">
          <p className="font-semibold text-cream">Learn</p>
          <ul className="mt-3 space-y-2 text-cream/70">
            <li><Link href="/programs" className="hover:text-cream">Program Highlights</Link></li>
            <li><Link href="/syllabus" className="hover:text-cream">Syllabus</Link></li>
            <li><Link href="/campus-life" className="hover:text-cream">Campus Life</Link></li>
          </ul>
          <p className="mt-6 font-semibold text-cream">Connect</p>
          <ul className="mt-3 space-y-2 text-cream/70">
            <li><Link href="/parent-resources" className="hover:text-cream">Parent Portal</Link></li>
            <li><Link href="/careers" className="hover:text-cream">Careers</Link></li>
            <li><Link href="/privacy" className="hover:text-cream">Privacy Policy</Link></li>
          </ul>
        </nav>
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
