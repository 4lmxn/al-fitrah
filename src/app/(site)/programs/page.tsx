import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { programs } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { EyebrowPill, Eyebrow } from "@/components/ui/EyebrowPill";
import { RainbowWords } from "@/components/ui/Rainbow";
import { Doodle } from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Reveal";
import { TONES } from "@/components/ui/FeatureCard";
import { ProgramLevels } from "@/components/pages/ProgramLevels";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { cn } from "@/lib/cn";

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/programs", {
  title: "Our Programs",
  description: "A 3-year integrated program: Noor-ul-Bayan Qur'an & Arabic with the Oxford Early Learning Curriculum (English, Mathematics, EVS). Entry at Pre-KG, ages 2y10m-3y10m.",
});
}

const tints = {
  emerald: "bg-emerald/10 text-emerald",
  gold: "bg-gold-soft text-gold",
  coral: "bg-coral-soft text-coral",
  grape: "bg-grape-soft text-grape",
  sky: "bg-sky-soft text-sky",
  leaf: "bg-leaf-soft text-leaf",
};

export default function ProgramsPage() {
  const { hero, method, outcomes } = programs;
  return (
    <>
      <Section className="relative overflow-hidden pb-10 pt-14 sm:pb-10 sm:pt-14">
        <Doodle kind="sun" color="#c9a227" className="left-[3%] top-6 w-14 sm:w-16" />
        <Doodle kind="star" color="#7cc15e" motion="twinkle" className="right-[9%] top-10 w-5" />
        <Doodle kind="cloud" color="#dbeafe" motion="bob2" className="bottom-4 left-[12%] hidden w-12 lg:block" />
        <Container className="relative z-10 text-center">
          <Reveal className="mx-auto max-w-3xl">
            <EyebrowPill className="mb-5">{hero.eyebrow}</EyebrowPill>
            <h1 className="text-4xl sm:text-5xl"><RainbowWords text={hero.title} words={["integrated"]} /></h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70">{hero.subtitle}</p>
          </Reveal>
          <div className="mx-auto mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            {hero.stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="flex items-center gap-3 rounded-xl4 bg-white px-6 py-4 shadow-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
                    <Icon name={s.icon} className="text-[24px]" />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{s.label}</p>
                    <p className="font-display text-xl font-bold text-emerald-deep">{s.value}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* What happens in each of the three years. The spine of the page. */}
      <ProgramLevels />

      {/* How we teach it — deliberately not another subject list, which the
          year-by-year section above already gives in full. */}
      <Section className="relative overflow-hidden">
        <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="left-[5%] top-[10%] w-5" />
        <Container className="relative z-10">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Our method</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              <RainbowWords text={method.title} words={method.rainbow} />
            </h2>
            <p className="mt-4 text-lg text-ink/70">{method.subtitle}</p>
          </Reveal>

          <SwipeRail label="How we teach" cols={3} className="mt-12">
            {method.items.map((m, i) => (
              <Reveal key={m.title} delay={i * 0.07} className="h-full">
                <div className="h-full rounded-xl4 bg-white p-7 shadow-soft transition duration-200 hover:-translate-y-2 hover:-rotate-1 hover:shadow-lift">
                  <span className={cn("grid h-14 w-14 place-items-center rounded-2xl", tints[TONES[i % TONES.length]])}>
                    <Icon name={m.icon} className="text-[26px]" />
                  </span>
                  <h3 className="mt-5 text-xl text-emerald-deep">{m.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/70">{m.body}</p>
                </div>
              </Reveal>
            ))}
          </SwipeRail>

          <Reveal delay={0.1}>
            <div className="relative mt-8 min-h-[340px] overflow-hidden rounded-xl4 shadow-soft sm:min-h-[420px]">
              <Image src={method.image} alt={method.imageAlt} fill sizes="(min-width:768px) 92vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep/85 via-emerald-deep/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <p className="font-display text-2xl font-bold text-cream sm:text-3xl">{method.imageCaption}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {method.tags.map((t) => (
                    <span key={t} className="rounded-full bg-cream/15 px-3 py-1 text-xs font-semibold text-cream ring-1 ring-cream/25">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* The payoff. This is the page's closing argument, so it gets the weight
          of a band rather than sitting in a card beside a photograph. */}
      <Section className="pt-0 sm:pt-0">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-xl4 bg-gradient-to-br from-emerald to-emerald-deep px-8 py-16 text-center text-cream shadow-lift sm:px-14">
              <div className="bg-geo-on-emerald pointer-events-none absolute inset-0 opacity-70" aria-hidden />
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/15 blur-3xl" aria-hidden />
              <Doodle kind="sun" color="#e3c97c" motion="none" className="-right-6 -top-7 w-32 opacity-40" />
              <Doodle kind="star" color="#e3c97c" motion="twinkle" className="bottom-10 left-8 w-6 opacity-60" />

              <div className="relative z-10 mx-auto max-w-3xl">
                <p className="font-display text-lg font-semibold text-gold-light">{outcomes.eyebrow}</p>
                <h2 className="mt-2 text-3xl text-cream sm:text-4xl">{outcomes.title}</h2>
                <p className="mx-auto mt-8 max-w-2xl font-display text-2xl font-semibold leading-snug text-cream sm:text-[1.75rem]">
                  {outcomes.statement}
                </p>
                <p className="mx-auto mt-6 max-w-xl text-cream/80">{outcomes.body}</p>
                <div className="mt-9 flex justify-center">
                  <Button href={outcomes.cta.href} variant={outcomes.cta.variant}>{outcomes.cta.label}</Button>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
