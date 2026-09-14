import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { getContact } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

const learn = [
  { href: "/programs", label: "Program Highlights" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/campus-life", label: "Campus Life" },
  { href: "/admissions", label: "Admissions" },
  { href: "/faq", label: "FAQ" },
];

const connect = [
  { href: "/parent-resources", label: "Parent Portal" },
  { href: "/careers", label: "Careers" },
  { href: "/news", label: "News" },
  { href: "/privacy", label: "Privacy Policy" },
];

export async function Footer() {
  const [{ school }, contact] = await Promise.all([getSettings(), getContact()]);

  return (
    <footer className="mt-20 rounded-t-[2.5rem] bg-emerald text-cream">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.5fr]">
        <div>
          <svg width="44" height="44" viewBox="0 0 48 48" aria-hidden>
            <rect width="48" height="48" rx="15" fill="#faf7f0" fillOpacity="0.12" />
            <path d="M24 10c-6 4-9 9-9 15a9 9 0 0018 0c0-6-3-11-9-15z" fill="#e3c97c" />
            <circle cx="24" cy="24" r="3.2" fill="#faf7f0" />
            <path d="M16 34h16" stroke="#faf7f0" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <p className="mt-4 font-display text-2xl font-extrabold text-cream">{school.name}</p>
          <p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-cream/55">{school.branch}</p>
          <p className="mt-4 max-w-[32ch] text-sm text-cream/75">{school.tagline}</p>
        </div>

        <nav aria-label="Footer">
          <p className="font-display text-lg font-semibold text-cream">Learn</p>
          <ul className="mt-3 text-sm text-cream/80">
            {learn.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-1 transition hover:text-gold-light">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer links">
          <p className="font-display text-lg font-semibold text-cream">Connect</p>
          <ul className="mt-3 text-sm text-cream/80">
            {connect.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block py-1 transition hover:text-gold-light">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm text-cream/80">
          <p className="font-display text-lg font-semibold text-cream">Come visit</p>
          <ul className="mt-3 space-y-2.5">
            <li className="flex gap-2.5">
              <Icon name="location_on" className="mt-0.5 shrink-0 text-[18px] text-gold-light" />
              <a href={contact.mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-cream">
                {contact.addressLine}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Icon name="call" className="mt-0.5 shrink-0 text-[18px] text-gold-light" />
              <a href={`tel:${contact.phoneE164}`} className="hover:text-cream">{contact.phone}</a>
            </li>
            <li className="flex gap-2.5">
              <Icon name="mail" className="mt-0.5 shrink-0 text-[18px] text-gold-light" />
              <a href={`mailto:${contact.email}`} className="break-all hover:text-cream">{contact.email}</a>
            </li>
            <li className="flex gap-2.5">
              <Icon name="schedule" className="mt-0.5 shrink-0 text-[18px] text-gold-light" />
              <span>Mon&ndash;Sat · 9:00 AM &ndash; 1:30 PM</span>
            </li>
          </ul>
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2 font-display font-semibold text-cream ring-1 ring-cream/20 transition hover:bg-cream/15"
          >
            <Icon name="chat" className="text-[18px] text-gold-light" /> WhatsApp us
          </a>
        </div>
      </Container>

      <Container className="border-t border-cream/10 py-5 text-center text-xs text-cream/70">
        © {new Date().getFullYear()} {school.name}, {school.branch}. All rights reserved.
      </Container>
    </footer>
  );
}
