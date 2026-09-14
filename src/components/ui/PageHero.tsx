import { Container } from "./Container";
import { Section } from "./Section";
import { EyebrowPill } from "./EyebrowPill";
import { Doodle } from "./Doodle";
import { RainbowWords } from "./Rainbow";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  highlight,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  highlight?: string[];
}) {
  return (
    <Section className="relative overflow-hidden pb-10 pt-14 sm:pb-10 sm:pt-14">
      <Doodle kind="sun" color="#c9a227" className="left-[3%] top-6 w-14 sm:w-16" />
      <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="left-[10%] top-32 w-5" />
      <Doodle kind="cloud" color="#dbeafe" motion="bob2" className="right-[8%] top-8 w-12 sm:w-16" />
      <Doodle kind="star" color="#ee7f82" motion="twinkle" className="bottom-6 right-[16%] w-5" />

      <Container className="relative z-10 max-w-3xl text-center">
        {eyebrow && <EyebrowPill className="mb-5">{eyebrow}</EyebrowPill>}
        <h1 className="text-4xl sm:text-5xl">
          <RainbowWords text={title} words={highlight} />
        </h1>
        {subtitle && <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70">{subtitle}</p>}
      </Container>
    </Section>
  );
}
