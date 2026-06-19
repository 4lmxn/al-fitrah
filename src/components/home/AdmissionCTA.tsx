import { home } from "@/content/home";
import { CTABand } from "@/components/ui/CTABand";

export function AdmissionCTA() {
  const { seats } = home;
  return (
    <div data-testid="cta-band">
      <CTABand title={seats.title} subtitle={seats.subtitle} cta={seats.cta} />
    </div>
  );
}
