import { Container } from "./Container";
import { Section } from "./Section";
import { EyebrowPill } from "./EyebrowPill";
export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <Section className="pb-10 pt-16 sm:pt-20">
      <Container className="max-w-3xl text-center">
        {eyebrow && <EyebrowPill className="mb-5">{eyebrow}</EyebrowPill>}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70">{subtitle}</p>}
      </Container>
    </Section>
  );
}
