import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { campus } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/campus-life", {
  title: "Campus Life",
  description: "Inside a day at Al Fitrah Pre School, Sarjapura — a calm rhythm of Oxford Early Learning, Qur'an with Noor-ul-Bayan, and joyful play in Bengaluru.",
});
}

// 6 tiles → 6 cells: big feature + five supporting (4-col / 3-row desktop).
const spans = [
  "sm:col-span-2 sm:row-span-2",
  "sm:col-span-1 sm:row-span-1",
  "sm:col-span-1 sm:row-span-1",
  "sm:col-span-2 sm:row-span-1",
  "sm:col-span-1 sm:row-span-1",
  "sm:col-span-1 sm:row-span-1",
];

export default function CampusLifePage() {
  const { hero, gallery, rhythm } = campus;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <Section className="pt-0">
        <Container>
          <div className="grid auto-rows-[13rem] grid-cols-1 gap-4 sm:grid-cols-4">
            {gallery.map((tile, i) => (
              <Reveal key={tile.title} delay={i * 0.05} className={`${spans[i]} h-full`}>
                <article className="group relative h-full overflow-hidden rounded-xl3 shadow-soft ring-1 ring-emerald/10">
                  <Image src={tile.image} alt={tile.title} fill sizes="(min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep/85 via-emerald-deep/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-xl text-cream">{tile.title}</h3>
                    {tile.caption && <p className="mt-1 text-sm text-cream/80">{tile.caption}</p>}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-cream-deep/60">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">{rhythm.title}</h2>
            <p className="mt-4 text-lg text-ink/70">{rhythm.subtitle}</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {rhythm.items.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08} className="h-full">
                <FeatureCard {...item} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
