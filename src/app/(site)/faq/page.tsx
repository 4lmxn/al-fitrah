import type { Metadata } from "next";
import { pageMeta, jsonLdHtml } from "@/lib/seo";
import { faq } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { CTABand } from "@/components/ui/CTABand";
import { Reveal } from "@/components/ui/Reveal";
import { Accordion } from "@/components/pages/Accordion";

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/faq", {
  title: "FAQ",
  description: "Answers about admissions, the Noor-ul-Bayan curriculum, fees, and daily schedule at Al Fitrah Pre School, Sarjapura, Bengaluru.",
});
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.groups.flatMap((g) =>
    g.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    }))
  ),
};

export default function FaqPage() {
  const { hero, groups, cta } = faq;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd) }} />
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} highlight={["questions"]} />

      <Section className="pt-0">
        <Container className="grid gap-10 lg:grid-cols-12">
          {/* Sidebar */}
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Categories</p>
              <nav className="mt-4 flex flex-col gap-1" aria-label="FAQ categories">
                {groups.map((g) => (
                  <a key={g.id} href={`#${g.id}`} className="rounded-lg border-l-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:border-emerald hover:bg-emerald/5 hover:text-emerald-deep">
                    {g.category}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-12 lg:col-span-9">
            {groups.map((g) => (
              <section key={g.id} id={g.id} className="scroll-mt-24">
                <Reveal>
                  <div className="flex items-center gap-3 border-b border-emerald/10 pb-4">
                    <Icon name={g.icon} className="text-gold" />
                    <h2 className="text-2xl text-emerald-deep">{g.category}</h2>
                  </div>
                  <div className="mt-6"><Accordion items={g.items} /></div>
                </Reveal>
              </section>
            ))}
          </div>
        </Container>
      </Section>

      <CTABand title={cta.title} subtitle={cta.body} cta={cta.cta} icon="contact_support" />
    </>
  );
}
