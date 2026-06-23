import type { Metadata } from "next";
import Image from "next/image";
import { contact } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Contact Us — Al Fitrah Pre School",
  description: "Visit, call, or email Al Fitrah in Sarjapura, Bengaluru. School hours and campus location inside.",
};

export default function ContactPage() {
  const { hero, details, image, imageAlt, hours } = contact;
  const rows = [
    { icon: "location_on", label: "Address", value: details.address },
    { icon: "call", label: "Phone", value: details.phones },
    { icon: "mail", label: "Email", value: [details.email] },
  ];
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <Section className="pt-0">
        <Container className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="h-full rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
              <h2 className="border-b border-emerald/10 pb-4 text-2xl text-emerald-deep">Contact details</h2>
              <ul className="mt-6 space-y-6">
                {rows.map((r) => (
                  <li key={r.label} className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald/8 text-emerald ring-1 ring-emerald/10">
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
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-xl3 border border-emerald/10 shadow-soft">
              <Image src={image} alt={imageAlt} fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-xl3 bg-emerald-deep p-10 text-center text-cream shadow-lift sm:p-14">
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
