import Image from "next/image";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/EyebrowPill";
import { RainbowWords } from "@/components/ui/Rainbow";
import { Doodle } from "@/components/ui/Doodle";
import { SwipeRail } from "@/components/ui/SwipeRail";

// Each frame gets its own hand-cut silhouette so the row never reads as four
// identical crops.
const wobbles = ["wobble-1", "wobble-2", "wobble-3", "wobble-4"];

export function Highlights() {
  const { highlights } = home;
  return (
    <Section className="relative overflow-hidden bg-cream-deep/60">
      <Doodle kind="star" color="#ee7f82" motion="twinkle" className="left-[6%] top-[12%] w-5" />
      <Doodle kind="dot" color="#7cc15e" motion="twinkle" className="bottom-[14%] right-[7%] w-4" />
      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{highlights.eyebrow}</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text={highlights.title} words={highlights.rainbow} />
          </h2>
          <p className="mt-4 text-lg text-ink/70">{highlights.subtitle}</p>
        </Reveal>
        <SwipeRail label="Campus life photographs" cols={4} className="mt-12">
          {highlights.tiles.map((tile, i) => (
            <Reveal key={tile.title} delay={i * 0.06}>
              <figure className="text-center">
                <div
                  className={`${wobbles[i % wobbles.length]} relative aspect-square overflow-hidden border-[6px] border-white shadow-soft transition duration-300 hover:-translate-y-2`}
                >
                  <Image
                    src={tile.image}
                    alt={tile.title}
                    fill
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-4">
                  <h3 className="text-xl text-emerald-deep">{tile.title}</h3>
                  <p className="mt-1 text-sm text-ink/60">{tile.caption}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </SwipeRail>
      </Container>
    </Section>
  );
}
