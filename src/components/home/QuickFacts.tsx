// src/components/home/QuickFacts.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
export function QuickFacts() {
  return (
    <Section className="py-10">
      <Container>
        <dl className="grid grid-cols-2 gap-4 rounded-xl2 border border-emerald/10 bg-white p-6 sm:grid-cols-4">
          {home.quickFacts.map((f) => (
            <div key={f.label} className="text-center">
              <dt className="text-xs uppercase tracking-wide text-ink/50">{f.label}</dt>
              <dd className="mt-1 font-display text-2xl text-emerald">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}
