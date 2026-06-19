import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export function Testimonials() {
  const { testimonials } = home;
  return (
    <Section className="bg-cream-deep/60">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl">{testimonials.title}</h2>
          <p className="mt-4 text-lg text-ink/70">{testimonials.subtitle}</p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.items.map((t, i) => (
            <Reveal key={t.author} delay={i * 0.08} className="h-full">
              <figure className="relative h-full rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
                <Icon name="format_quote" className="text-[40px] text-gold/30" />
                <blockquote className="mt-2 leading-relaxed text-ink/80">{t.quote}</blockquote>
                <figcaption className="mt-6 border-t border-emerald/10 pt-4">
                  <p className="font-semibold text-emerald-deep">{t.author}</p>
                  <p className="text-sm text-ink/60">{t.relation}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
