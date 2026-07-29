// src/components/layout/Footer.tsx
import Link from "next/link";
import { site } from "@/content/site";
import { Container } from "@/components/ui/Container";
import { PHONE_E164, WHATSAPP_URL, MAPS_DIRECTIONS_URL } from "@/lib/seo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-emerald/10 bg-emerald text-cream">
      <Container className="grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg">{site.name} <span className="text-cream/80">· {site.branch}</span></p>
          <p className="mt-2 text-sm text-cream/80">{site.tagline}</p>
        </div>
        <nav className="text-sm" aria-label="Footer">
          <p className="font-semibold text-cream">Learn</p>
          {/* py on links keeps every tap target ≥24px (WCAG 2.2) and lifts the
              muted text to AA contrast on the emerald ground. */}
          <ul className="mt-2 text-cream/80">
            <li><Link href="/programs" className="block py-1 hover:text-cream">Program Highlights</Link></li>
            <li><Link href="/syllabus" className="block py-1 hover:text-cream">Syllabus</Link></li>
            <li><Link href="/campus-life" className="block py-1 hover:text-cream">Campus Life</Link></li>
          </ul>
          <p className="mt-5 font-semibold text-cream">Connect</p>
          <ul className="mt-2 text-cream/80">
            <li><Link href="/parent-resources" className="block py-1 hover:text-cream">Parent Portal</Link></li>
            <li><Link href="/careers" className="block py-1 hover:text-cream">Careers</Link></li>
            <li><Link href="/privacy" className="block py-1 hover:text-cream">Privacy Policy</Link></li>
          </ul>
        </nav>
        <div className="text-sm text-cream/80">
          <p className="font-semibold text-cream">Contact</p>
          <a
            href={MAPS_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block py-1 hover:text-cream"
          >
            {site.contact.address}
          </a>
          <a href={`tel:${PHONE_E164}`} className="block py-1 hover:text-cream">{site.contact.phone}</a>
          <a href={`mailto:${site.contact.email}`} className="block py-1 hover:text-cream">{site.contact.email}</a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2 font-semibold text-cream ring-1 ring-cream/20 hover:bg-cream/15"
          >
            WhatsApp us
          </a>
          <p className="mt-4 text-cream/80">School hours: 9:00 AM – 1:30 PM</p>
        </div>
      </Container>
      <Container className="border-t border-cream/10 py-5 text-xs text-cream/75">
        © {new Date().getFullYear()} {site.name}, {site.branch}. All rights reserved.
      </Container>
    </footer>
  );
}
