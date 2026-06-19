import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Reveal } from "@/components/ui/Reveal";

export function Approach() {
  const { approach } = home;
  return (
    <Section>
      <Container>
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">{approach.eyebrow}</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">{approach.title}</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {approach.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} className="h-full">
              <FeatureCard {...item} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
