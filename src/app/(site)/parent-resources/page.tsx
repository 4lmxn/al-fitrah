import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { parent } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { ProspectusMagnet } from "@/components/pages/ProspectusMagnet";
import { FactSection } from "@/components/pages/FactSections";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { facts } from "@/content/facts";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/parent-resources", {
  title: "Parent Resources",
  description: "Parent resources for Al Fitrah Pre School, Sarjapura: the 2026-27 academic calendar, uniform and handbook guidance, and ways to get involved.",
});
}

const tints = ["bg-emerald/10 text-emerald", "bg-coral-soft text-coral", "bg-grape-soft text-grape", "bg-gold-soft text-gold", "bg-sky-soft text-sky", "bg-leaf-soft text-leaf"];

export default function ParentResourcesPage() {
  const { hero, resources, academicCalendar } = parent;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} highlight={["resources"]} />

      <Section className="pt-0 sm:pt-0">
        <Container>
          <SwipeRail
            label="Parent resources"
            cols={3}
            className="sm:auto-rows-[minmax(11rem,auto)] sm:gap-5"
            itemClassName={(i) => (resources[i]?.large ? "sm:col-span-2 sm:row-span-2" : "")}
          >
            {resources.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06} className="h-full">
                {/* Informational cards — no downloads are live yet, so these are
                    not links. Families are pointed to the contact CTA below. */}
                <div
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-xl4 bg-white p-6 shadow-soft sm:p-8`}
                >
                  <Icon name={r.icon} className={`pointer-events-none absolute -right-4 -top-2 text-emerald/5 ${r.large ? "text-[140px]" : "text-[96px]"}`} />
                  <div className="relative">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tints[i % tints.length]}`}>
                      <Icon name={r.icon} className="text-[24px]" />
                    </span>
                    <h3 className={`mt-5 text-emerald-deep ${r.large ? "text-2xl" : "text-xl"}`}>{r.title}</h3>
                    <p className="mt-2 max-w-sm leading-relaxed text-ink/70">{r.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </SwipeRail>

          <Reveal className="mt-10">
            <ProspectusMagnet />
          </Reveal>

          <Reveal className="mt-6 flex flex-col items-center gap-4 rounded-xl4 bg-emerald/5 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="max-w-xl leading-relaxed text-ink/75">
              Need the parent handbook or uniform details? Our team will share the latest copy with you directly.
            </p>
            <Link
              href="/contact"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
            >
              Request from our team
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </Reveal>
        </Container>
      </Section>

      {/* Real academic calendar — sourced from the school's 2026–27 year planner. */}
      <Section id="calendar" className="bg-cream-deep/60">
        <Container>
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Year planner</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">{academicCalendar.title}</h2>
            <p className="mt-3 text-lg text-ink/70">{academicCalendar.subtitle}</p>
          </Reveal>

          <Reveal delay={0.05} className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald/10 bg-white/80 p-5 shadow-soft">
            <Icon name="info" className="mt-0.5 shrink-0 text-[22px] text-emerald" />
            <p className="leading-relaxed text-ink/75">{academicCalendar.note}</p>
          </Reveal>

          <SwipeRail label="Academic calendar" cols={2} className="mt-8 sm:gap-5">
            {academicCalendar.groups.map((g, i) => (
              <Reveal key={g.title} delay={i * 0.06} className="h-full">
                <div className="flex h-full flex-col rounded-xl4 bg-white p-6 shadow-soft sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tints[i % tints.length]}`}>
                      <Icon name={g.icon} className="text-[22px]" />
                    </span>
                    <h3 className="text-xl text-emerald-deep">{g.title}</h3>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {g.items.map((item) => {
                      const [event, date] = item.split(" - ");
                      return (
                        <li key={item} className="flex items-baseline justify-between gap-4 border-b border-emerald/5 pb-2.5 last:border-0 last:pb-0">
                          <span className="text-ink/75">{event}</span>
                          {date && <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-deep">{date}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            ))}
          </SwipeRail>
        </Container>
      </Section>
      <FactSection
        items={facts.communication}
        eyebrow="Staying in touch"
        title="How you will hear from us."
        rainbow={["hear"]}
        subtitle="What we send, how often, and who to contact when something comes up."
        tone="deep"
      />

      <FactSection
        items={facts.health}
        eyebrow="Food & health"
        title="Snacks, allergies and sick days."
        rainbow={["health"]}
      />
    </>
  );
}
