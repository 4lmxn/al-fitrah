// src/components/home/WhyUs.tsx
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
export function WhyUs() {
  return (
    <Section>
      <Container>
        <h2 className="text-3xl">Why families choose Al Fitrah</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {home.whyUs.map((w) => (
            <div key={w.title} className="rounded-xl2 border border-emerald/10 bg-white p-6">
              <h3 className="text-xl text-emerald">{w.title}</h3>
              <p className="mt-2 text-ink/70">{w.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
