import { getPrograms } from "@/lib/taxonomy";
import { contact } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { InquiryForm } from "@/components/pages/InquiryForm";
import { MapEmbed } from "@/components/pages/MapEmbed";
import { pageMeta, getContact } from "@/lib/seo";
import type { Metadata } from "next";

// Async because the brand comes from configuration; a module-scope constant
// cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/contact", {
    title: "Contact Us",
    description: "Visit, call, or email Al Fitrah in Sarjapura, Bengaluru. Campus location and visiting details inside.",
  });
}

// Reads configured programs, so this page is revalidated rather than fully
// static. Still zero Firestore reads per visitor — one read per revalidation
// window, and editing settings invalidates the tag so a new program appears
// without waiting it out. Cost invariant 3 holds: public pages never read
// per request.
export const revalidate = 3600;

export default async function ContactPage() {
  // `contact` is page copy; `school` is the configured identity.
  const [programs, school] = await Promise.all([getPrograms(), getContact()]);
  const { hero, details, hours } = contact;
  const rows = [
    { icon: "location_on", label: "Address", value: details.address },
    { icon: "call", label: "Phone", value: details.phones },
    { icon: "mail", label: "Email", value: [details.email] },
  ];
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} highlight={["love"]} />

      <Section className="pt-0 sm:pt-0">
        <Container className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="h-full rounded-xl4 bg-white p-8 shadow-soft">
              <h2 className="border-b border-emerald/10 pb-4 text-2xl text-emerald-deep">Contact details</h2>
              <ul className="mt-6 space-y-6">
                {rows.map((r) => (
                  <li key={r.label} className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                      <Icon name={r.icon} className="text-[22px]" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{r.label}</p>
                      <div className="mt-1 space-y-0.5 text-ink/80">
                        {r.value.map((v) => <p key={v} className="break-words">{v}</p>)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={school.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-dark"
                >
                  <Icon name="chat" className="text-[18px]" /> WhatsApp
                </a>
                <a
                  href={`tel:${school.phoneE164}`}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald/30 px-5 py-3 text-sm font-semibold text-emerald transition hover:bg-emerald/5"
                >
                  <Icon name="call" className="text-[18px]" /> Call
                </a>
                <a
                  href={school.mapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald/30 px-5 py-3 text-sm font-semibold text-emerald transition hover:bg-emerald/5"
                >
                  <Icon name="directions" className="text-[18px]" /> Directions
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-xl4 shadow-soft">
              <MapEmbed
                embedUrl={school.mapsEmbedUrl}
                directionsUrl={school.mapsDirectionsUrl}
                title="Map to Al Fitrah Pre School, Sarjapura, Bengaluru"
              />
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* Parents land here expecting a way to write in, not just phone numbers.
          Same form and API as the admissions page — one leads pipeline. */}
      <Section id="message" className="pt-0 sm:pt-0">
        <Container className="max-w-3xl">
          <Reveal>
            <div className="rounded-xl4 bg-white p-8 shadow-soft sm:p-10">
              <h2 className="text-2xl text-emerald-deep">Send us a message</h2>
              <p className="mt-2 text-ink/70">
                Tell us a little about your child and we&apos;ll get back to you. Prefer to talk? Call or
                WhatsApp us on {details.phones[0]}.
              </p>
              <div className="mt-8">
                <InquiryForm programs={programs} />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="pt-0 sm:pt-0">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-xl4 bg-gradient-to-br from-emerald to-emerald-deep p-10 text-center text-cream shadow-lift sm:p-14">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/15 blur-3xl" aria-hidden />
              <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold-light ring-1 ring-gold/20">
                <Icon name="schedule" className="text-[28px]" />
              </span>
              <h2 className="text-3xl text-cream">{hours.title}</h2>
              <div className="mt-8 flex flex-col justify-center gap-5 sm:flex-row">
                {hours.rows.map((r) => (
                  <div key={r.label} className="min-w-[240px] rounded-2xl bg-cream/10 p-6 ring-1 ring-cream/15">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold-light">{r.label}</p>
                    <p className="mt-2 font-display text-2xl text-cream">{r.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-cream/75">{hours.note}</p>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
