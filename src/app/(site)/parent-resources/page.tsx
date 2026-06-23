import type { Metadata } from "next";
import Link from "next/link";
import { parent } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Parent Resources — Al Fitrah Pre School",
  description: "Academic calendar, halal lunch menu, uniform guidelines, parent handbook, and ways to get involved.",
};

export default function ParentResourcesPage() {
  const { hero, resources } = parent;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <Section className="pt-0">
        <Container>
          <div className="grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-5 md:grid-cols-3">
            {resources.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06} className={r.large ? "md:col-span-2 md:row-span-2" : ""}>
                {/* Informational cards — no downloads are live yet, so these are
                    not links. Families are pointed to the contact CTA below. */}
                <div
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft`}
                >
                  <Icon name={r.icon} className={`pointer-events-none absolute -right-4 -top-2 text-emerald/5 ${r.large ? "text-[140px]" : "text-[96px]"}`} />
                  <div className="relative">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                      <Icon name={r.icon} className="text-[24px]" />
                    </span>
                    <h3 className={`mt-5 text-emerald-deep ${r.large ? "text-2xl" : "text-xl"}`}>{r.title}</h3>
                    <p className="mt-2 max-w-sm leading-relaxed text-ink/70">{r.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 flex flex-col items-center gap-4 rounded-xl3 border border-emerald/10 bg-emerald/5 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="max-w-xl leading-relaxed text-ink/75">
              Need the academic calendar, lunch menu, parent handbook, or uniform details? Our team will share the latest copy with you directly.
            </p>
            <Link
              href="/contact"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
            >
              Request from our team
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
