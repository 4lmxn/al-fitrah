import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { FeatureCard, TONES } from "@/components/ui/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/EyebrowPill";
import { RainbowWords } from "@/components/ui/Rainbow";
import { Doodle } from "@/components/ui/Doodle";
import { SwipeRail } from "@/components/ui/SwipeRail";

export function Approach() {
  const { approach } = home;
  return (
    <Section className="relative overflow-hidden">
      <Doodle kind="kite" color="#7cc15e" motion="sway" className="left-[6%] top-[8%] hidden w-7 text-gold lg:block" />
      <Doodle kind="sparkle" color="#6fb2f0" motion="twinkle" className="right-[8%] top-[12%] w-5" />
      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{approach.eyebrow}</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text={approach.title} words={approach.rainbow} />
          </h2>
          <p className="mt-4 text-lg text-ink/70">{approach.subtitle}</p>
        </Reveal>
        <SwipeRail label="Our approach" cols={3} className="mt-12">
          {approach.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} className="h-full">
              <FeatureCard {...item} tone={TONES[i % TONES.length]} />
            </Reveal>
          ))}
        </SwipeRail>
      </Container>
    </Section>
  );
}
