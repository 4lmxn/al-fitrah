import type { Metadata } from "next";
import Image from "next/image";
import { about } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "About Us — Al Fitrah Islamic Pre-School",
  description: "Our story, mission, and the certified educators nurturing every child's Deen and Dunya at Al Fitrah.",
};

export default function AboutPage() {
  const { hero, mission, vision, team, location } = about;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <Section className="pt-0">
        <Container className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <div className="relative h-full overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 p-10 shadow-soft">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald/5 blur-3xl" aria-hidden />
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                <Icon name="menu_book" className="text-[28px]" />
              </span>
              <h2 className="mt-6 text-3xl text-emerald-deep">{mission.title}</h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">{mission.body}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4">
            <div className="relative h-full overflow-hidden rounded-xl3 bg-emerald-deep p-10 text-cream shadow-lift">
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-gold/15 blur-3xl" aria-hidden />
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cream/10 text-gold-light ring-1 ring-cream/15">
                <Icon name="psychology" className="text-[28px]" />
              </span>
              <h3 className="mt-6 text-2xl text-cream">{vision.title}</h3>
              <p className="mt-3 leading-relaxed text-cream/80">{vision.body}</p>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="bg-cream-deep/60">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">{team.title}</h2>
            <p className="mt-4 text-lg text-ink/70">{team.subtitle}</p>
          </Reveal>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl3 border border-emerald/10 shadow-soft">
                <Image src={team.image} alt={team.imageAlt} fill sizes="(min-width:1024px) 46vw, 100vw" className="object-cover" />
              </div>
            </Reveal>
            <div className="space-y-6">
              {team.points.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.08}>
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                      <Icon name={p.icon} className="text-[24px]" />
                    </span>
                    <div>
                      <h3 className="text-xl text-emerald-deep">{p.title}</h3>
                      <p className="mt-2 leading-relaxed text-ink/70">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Reveal>
            <div className="grid overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 shadow-soft lg:grid-cols-2">
              <div className="flex flex-col justify-center p-10">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-deep ring-1 ring-gold/30">
                  <Icon name="location_on" className="text-sm" /> {location.eyebrow}
                </span>
                <h2 className="mt-4 text-3xl text-emerald-deep">{location.title}</h2>
                <address className="mt-4 space-y-1 not-italic text-ink/70">
                  {location.lines.map((l) => <p key={l}>{l}</p>)}
                </address>
                <div className="mt-7"><Button href="/contact" variant="outline">Get directions</Button></div>
              </div>
              <div className="relative min-h-[280px]">
                <Image src={location.image} alt={location.imageAlt} fill sizes="(min-width:1024px) 46vw, 100vw" className="object-cover" />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
