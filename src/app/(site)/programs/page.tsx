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

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/programs", {
  title: "Our Programs",
  description: "A 3-year integrated program: Noor-ul-Bayan Qur'an & Arabic with the Oxford Early Learning Curriculum (English, Mathematics, EVS). Entry at Pre-KG, ages 2y10m-3y10m.",
});
}

export default function ProgramsPage() {
  const { hero, curriculum, outcomes } = programs;
  return (
    <>
      <Section className="relative overflow-hidden pb-10 pt-14">
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
                    <p className="font-display text-xl text-emerald-deep">{s.value}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-cream-deep/60">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl"><RainbowWords text={curriculum.title} words={["learns"]} /></h2>
            <p className="mt-4 text-lg text-ink/70">{curriculum.subtitle}</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Quran — large emerald card */}
            <Reveal className="md:col-span-2">
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl4 bg-gradient-to-br from-emerald to-emerald-deep p-8 text-cream shadow-lift">
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/15 blur-3xl" aria-hidden />
                <div className="flex items-start justify-between">
                  <h3 className="text-2xl text-cream">{curriculum.quran.title}</h3>
                  <Icon name="auto_stories" className="text-[36px] text-gold-light" />
                </div>
                <div className="mt-10 grid gap-6 sm:grid-cols-2">
                  {curriculum.quran.items.map((it) => (
                    <div key={it.label}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gold-light">{it.label}</p>
                      <p className="mt-2 text-cream/85">{it.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            {/* Modern subjects */}
            <Reveal delay={0.08}>
              <div className="flex h-full flex-col gap-6 rounded-xl4 bg-white p-8 shadow-soft">
                {curriculum.modern.map((m, i) => (
                  <div key={m.title}>
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-gold ">
                        <Icon name={m.icon} className="text-[22px]" />
                      </span>
                      <div>
                        <h4 className="text-lg text-emerald-deep">{m.title}</h4>
                        <p className="mt-1 text-sm text-ink/70">{m.body}</p>
                      </div>
                    </div>
                    {i === 0 && <div className="mt-6 h-px bg-emerald/10" />}
                  </div>
                ))}
              </div>
            </Reveal>
            {/* Spiritual */}
            <Reveal>
              <div className="h-full rounded-xl4 bg-white p-8 shadow-soft">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl text-emerald-deep">{curriculum.spiritual.title}</h3>
                  <Icon name="self_improvement" className="text-[28px] text-gold" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {curriculum.spiritual.tags.map((t) => (
                    <span key={t} className="rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald-deep">{t}</span>
                  ))}
                </div>
                <p className="mt-5 text-ink/70">{curriculum.spiritual.body}</p>
              </div>
            </Reveal>
            {/* Image */}
            <Reveal delay={0.08} className="md:col-span-2">
              <div className="relative h-full min-h-[260px] overflow-hidden rounded-xl4 shadow-soft">
                <Image src={curriculum.image} alt={curriculum.imageAlt} fill sizes="(min-width:768px) 64vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep/80 to-transparent" />
                <p className="absolute bottom-0 p-6 font-display text-2xl text-cream">{curriculum.imageCaption}</p>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="arch relative aspect-square overflow-hidden border-[6px] border-white shadow-lift">
              <Image src={outcomes.image} alt={outcomes.imageAlt} fill sizes="(min-width:1024px) 46vw, 100vw" className="object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-xl4 bg-white p-10 shadow-soft">
              <h2 className="text-3xl text-emerald-deep">{outcomes.title}</h2>
              <div className="mt-3"><Eyebrow>{outcomes.eyebrow}</Eyebrow></div>
              <blockquote className="mt-6 rounded-2xl border-l-4 border-emerald bg-cream-deep/50 p-6">
                <p className="font-display text-xl leading-relaxed text-emerald-deep">{outcomes.quote}</p>
              </blockquote>
              <p className="mt-6 leading-relaxed text-ink/70">{outcomes.body}</p>
              <div className="mt-8"><Button href={outcomes.cta.href} variant={outcomes.cta.variant}>{outcomes.cta.label}</Button></div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
