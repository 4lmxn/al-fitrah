// src/components/home/ProgramsPreview.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
export function ProgramsPreview() {
  return (
    <Section className="bg-gold/5">
      <Container>
        <h2 className="text-3xl">Our programs</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {home.programs.map((p) => (
            <div key={p.title} className="rounded-xl2 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">{p.ageGroup}</p>
              <h3 className="mt-1 text-xl text-emerald">{p.title}</h3>
              <p className="mt-2 text-ink/70">{p.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-8"><Button href="/programs" variant="outline">See all programs</Button></div>
      </Container>
    </Section>
  );
}
