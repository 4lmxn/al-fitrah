import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { campus } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { FeatureCard, TONES } from "@/components/ui/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";
import { Doodle } from "@/components/ui/Doodle";
import { RainbowWords } from "@/components/ui/Rainbow";
import { DayTimeline, FactSection } from "@/components/pages/FactSections";
import { facts } from "@/content/facts";

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/campus-life", {
  title: "Campus Life",
  description: "Inside a day at Al Fitrah Pre School, Sarjapura: a calm rhythm of Oxford Early Learning, Qur'an with Noor-ul-Bayan, and joyful play in Bengaluru.",
});
}

// Each frame gets its own hand-cut silhouette so a wall of photos never reads
// as six identical crops.
const wobbles = ["wobble-1", "wobble-2", "wobble-3", "wobble-4"];

export default function CampusLifePage() {
  const { hero, gallery, rhythm } = campus;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} highlight={["joyful"]} />

      <Section className="relative overflow-hidden pt-0">
        <Doodle kind="star" color="#ee7f82" motion="twinkle" className="left-[5%] top-4 w-5" />
        <Doodle kind="dot" color="#7cc15e" motion="twinkle" className="bottom-8 right-[6%] w-4" />
        <Container className="relative z-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((tile, i) => (
              <Reveal key={tile.title} delay={i * 0.05}>
                <figure className="text-center">
                  <div className={`${wobbles[i % wobbles.length]} relative aspect-square overflow-hidden border-[6px] border-white shadow-soft transition duration-300 hover:-translate-y-2`}>
                    <Image src={tile.image} alt={tile.title} fill sizes="(min-width:1024px) 32vw, (min-width:640px) 46vw, 100vw" className="object-cover" />
                  </div>
                  <figcaption className="mt-4">
                    <h3 className="text-xl text-emerald-deep">{tile.title}</h3>
                    {tile.caption && <p className="mt-1 text-sm text-ink/60">{tile.caption}</p>}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* The timetable with real clock times. Renders once supplied. */}
      <DayTimeline />

      <Section>
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl"><RainbowWords text={rhythm.title} words={["rhythm"]} /></h2>
            <p className="mt-4 text-lg text-ink/70">{rhythm.subtitle}</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {rhythm.items.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08} className="h-full">
                <FeatureCard {...item} tone={TONES[i % TONES.length]} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Renders once the school supplies its policies. Premises security and
          authorised pickup are among the first things a parent checks, and the
          campus being on a third floor makes them more pressing, not less. */}
      <FactSection
        items={facts.safety}
        eyebrow="Safety & hygiene"
        title="How we keep your child safe."
        rainbow={["safe"]}
        subtitle="Pickup, premises, emergencies and cleaning, stated plainly."
      />
    </>
  );
}
