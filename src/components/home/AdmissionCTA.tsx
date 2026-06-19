// src/components/home/AdmissionCTA.tsx
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
export function AdmissionCTA() {
  return (
    <Section>
      <Container>
        <div data-testid="admission-cta" className="rounded-xl2 bg-emerald px-8 py-14 text-center text-cream">
          <h2 className="text-3xl text-cream">Admissions are open</h2>
          <p className="mx-auto mt-3 max-w-md text-cream/80">
            Begin your child's journey with us. Apply online in a few minutes.
          </p>
          <div className="mt-7 flex justify-center">
            <Button href="/admissions" variant="gold">Apply now</Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
