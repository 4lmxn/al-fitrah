import { Container } from "./Container";
import { Section } from "./Section";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Doodle } from "./Doodle";

export function CTABand({
  title,
  subtitle,
  cta,
  icon = "campaign",
}: {
  title: string;
  subtitle?: string;
  cta: { label: string; href: string };
  icon?: string;
}) {
  return (
    <Section>
      <Container>
        <div className="relative overflow-hidden rounded-xl4 bg-gradient-to-br from-emerald to-emerald-deep px-8 py-16 text-center text-cream shadow-lift">
          {/* depth: geometric texture + soft gold glow, then a sun bleeding off
              the corner so the band reads hand-made rather than stamped */}
          <div className="bg-geo-on-emerald pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/15 blur-3xl" aria-hidden />
          <Doodle kind="sun" color="#e3c97c" motion="none" className="-right-5 -top-6 w-28 opacity-40" />
          <Doodle kind="star" color="#e3c97c" motion="twinkle" className="bottom-8 left-8 w-6 opacity-60" />
          <div className="relative z-10">
            <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold-light ring-1 ring-gold/20">
              <Icon name={icon} className="text-[32px]" />
            </span>
            <h2 className="mx-auto max-w-xl text-3xl text-cream sm:text-4xl">{title}</h2>
            {subtitle && <p className="mx-auto mt-4 max-w-xl text-cream/80">{subtitle}</p>}
            <div className="mt-9 flex justify-center">
              <Button href={cta.href} variant="gold">{cta.label}</Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
