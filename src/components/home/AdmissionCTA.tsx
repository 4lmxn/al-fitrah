import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { CaptureForm } from "@/components/pages/CaptureForm";

// "Limited seats" band with an inline, low-friction waitlist capture — a parent
// can register interest for 2026–27 in two fields without leaving the page.
export function AdmissionCTA() {
  const { seats } = home;
  return (
    <Section>
      <Container>
        <div data-testid="cta-band" className="relative overflow-hidden rounded-xl3 bg-emerald-deep px-8 py-14 text-cream shadow-lift sm:px-12">
          <div className="bg-geo-on-emerald pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-emerald/40 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-2xl text-center">
            <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold-light ring-1 ring-gold/20">
              <Icon name="event_available" className="text-[32px]" />
            </span>
            <h2 className="mx-auto max-w-xl text-3xl text-cream sm:text-4xl">{seats.title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/80">{seats.subtitle}</p>
            <div className="mx-auto mt-8 max-w-lg text-left">
              <CaptureForm
                source="waitlist"
                cta="Register interest"
                successTitle="You're on the waitlist"
                successBody="Thank you — we'll reach out about a place for 2026–27, in shaa Allah."
                dark
              />
              <p className="mt-3 text-center text-xs text-cream/60">No obligation — just a note that you&apos;re interested.</p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
