import type { Metadata } from "next";
import { parent } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Parent Resources — Al Fitrah Islamic Pre-School",
  description: "Academic calendar, halal lunch menu, uniform guidelines, parent handbook, and ways to get involved.",
};

export default function ParentResourcesPage() {
  const { hero, resources, testimonials } = parent;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <Section className="pt-0">
        <Container>
          <div className="grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-5 md:grid-cols-3">
            {resources.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06} className={r.large ? "md:col-span-2 md:row-span-2" : ""}>
                <a
                  href="#"
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift`}
                >
                  <Icon name={r.icon} className={`pointer-events-none absolute -right-4 -top-2 text-emerald/5 transition-colors group-hover:text-emerald/10 ${r.large ? "text-[140px]" : "text-[96px]"}`} />
                  <div className="relative">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                      <Icon name={r.icon} className="text-[24px]" />
                    </span>
                    <h3 className={`mt-5 text-emerald-deep ${r.large ? "text-2xl" : "text-xl"}`}>{r.title}</h3>
                    <p className="mt-2 max-w-sm leading-relaxed text-ink/70">{r.body}</p>
                  </div>
                  <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-deep">
                    {r.action}
                    <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

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
    </>
  );
}
