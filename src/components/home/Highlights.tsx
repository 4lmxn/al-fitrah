import Image from "next/image";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

// 4 items → 4 cells: big + wide + two small (4-col / 2-row on desktop).
const spans = [
  "sm:col-span-2 sm:row-span-2",
  "sm:col-span-2",
  "sm:col-span-1",
  "sm:col-span-1",
];

export function Highlights() {
  const { highlights } = home;
  return (
    <Section className="bg-cream-deep/60">
      <Container>
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">Life at Al Fitrah</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">A calm, joyful day, shaped with intention.</h2>
        </Reveal>
        <div className="mt-12 grid auto-rows-[13rem] grid-cols-1 gap-4 sm:grid-cols-4">
          {highlights.map((tile, i) => (
            <Reveal key={tile.title} delay={i * 0.06} className={`${spans[i]} h-full`}>
              <article className="group relative h-full overflow-hidden rounded-xl3 shadow-soft ring-1 ring-emerald/10">
                <Image
                  src={tile.image}
                  alt={tile.title}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep/85 via-emerald-deep/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-xl text-cream">{tile.title}</h3>
                  <p className="mt-1 text-sm text-cream/80">{tile.caption}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
