import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon";
import { pageMeta, getContact } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  ...pageMeta("/", {
    title: "Opening Soon",
    description:
      "Al Fitrah Pre School, Sarjapura — a faith-centred Islamic preschool in Bengaluru. Admissions for 2026–27 are opening soon. Call or WhatsApp us to enquire.",
  }),
  alternates: { canonical: "/" },
};

const facts = [
  { icon: "auto_stories", label: "Oxford Early Learning" },
  { icon: "menu_book", label: "Noor-ul-Bayan Qur'an method" },
  { icon: "location_on", label: "Sarjapura, Bengaluru" },
];

export default async function ComingSoonPage() {
  const [contact, { school }] = await Promise.all([getContact(), getSettings()]);
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-emerald-deep text-cream">
      <div className="bg-geo-on-emerald pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-emerald-light/25 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="font-display text-lg tracking-wide text-cream">
          {school.name} <span className="text-gold-light">· {school.branch}</span>
        </p>

        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light ring-1 ring-gold/20">
          <Icon name="calendar_month" className="text-base" />
          Admissions opening · 2026–27
        </span>

        <h1 className="mt-7 text-balance font-display text-4xl leading-[1.08] text-cream sm:text-6xl">
          Something beautiful is on its way.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/80">
          {school.tagline}{" "}Our new home online is almost ready. Until then,
          we&apos;d love to hear from you — reach out to enquire about a place for
          your child.
        </p>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {facts.map((f) => (
            <li
              key={f.label}
              className="inline-flex items-center gap-2 rounded-full bg-cream/8 px-4 py-2 text-sm font-medium text-cream/90 ring-1 ring-cream/12"
            >
              <Icon name={f.icon} className="text-[18px] text-gold-light" />
              {f.label}
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-light"
          >
            <Icon name="chat" className="text-[18px]" /> WhatsApp us
          </a>
          <a
            href={`tel:${contact.phoneE164}`}
            className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-cream/10"
          >
            <Icon name="call" className="text-[18px]" /> {contact.phone}
          </a>
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-cream/10"
          >
            <Icon name="mail" className="text-[18px]" /> Email
          </a>
        </div>
      </div>

      <footer className="relative z-10 border-t border-cream/10 px-6 py-6 text-center text-sm text-cream/60">
        <a
          href={contact.mapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-cream"
        >
          {contact.addressLine}
        </a>
        <p className="mt-2 text-cream/45">
          © {new Date().getFullYear()} {school.name}, {school.branch}. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
