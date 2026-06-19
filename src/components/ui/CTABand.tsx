import { Container } from "./Container";
import { Section } from "./Section";
import { Button } from "./Button";
export function CTABand({ title, subtitle, cta }: { title: string; subtitle?: string; cta: { label: string; href: string } }) {
  return (
    <Section>
      <Container>
        <div className="rounded-xl2 bg-emerald px-8 py-14 text-center text-cream">
          <h2 className="text-3xl text-cream">{title}</h2>
          {subtitle && <p className="mx-auto mt-3 max-w-md text-cream/80">{subtitle}</p>}
          <div className="mt-7 flex justify-center"><Button href={cta.href} variant="gold">{cta.label}</Button></div>
        </div>
      </Container>
    </Section>
  );
}
