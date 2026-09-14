import type { Metadata } from "next";
import { getPrograms } from "@/lib/taxonomy";
import { pageMeta } from "@/lib/seo";
import { admissions } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { InquiryForm } from "@/components/pages/InquiryForm";
import { FactSection, Fees } from "@/components/pages/FactSections";
import { facts } from "@/content/facts";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/admissions", {
  title: "Admissions",
  description: "Pre-KG admissions for 2026-27 at Al Fitrah Pre School, Sarjapura, Bengaluru. A clear, welcoming process for children aged 2y10m-3y10m. Enquire today.",
});
}

export const revalidate = 3600;

export default async function AdmissionsPage() {
  const programs = await getPrograms();
  const { hero, process, assist, form } = admissions;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} highlight={["place"]} />

      {/* Both render only once the school fills content/facts.ts. Separation
          anxiety is the first thing a parent of a 2y10m child asks about, and a
          fee schedule they cannot find is the commonest reason they leave. */}
      <FactSection
        items={facts.settlingIn}
        eyebrow="The first two weeks"
        title="Settling in, gently."
        rainbow={["gently"]}
        subtitle="Starting school is a big step at this age. Here is exactly how we handle it."
      />
      <Fees />

      <Section className="pt-0 sm:pt-0">
        <Container className="grid gap-8 lg:grid-cols-12">
          {/* Process + assistance */}
          <div className="space-y-8 lg:col-span-5">
            <Reveal>
              <div className="rounded-xl4 bg-white p-8 shadow-soft">
                <h2 className="flex items-center gap-3 text-2xl text-emerald-deep">
                  <Icon name="list_alt" className="text-gold" /> {process.title}
                </h2>
                <ol className="mt-8 space-y-7">
                  {process.steps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald/10 font-display text-lg text-emerald">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-emerald-deep">{s.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink/70">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="relative overflow-hidden rounded-xl4 bg-gradient-to-br from-emerald to-emerald-deep p-8 text-cream shadow-lift">
                <div className="pointer-events-none absolute -bottom-14 -right-10 h-48 w-48 rounded-full bg-gold/15 blur-3xl" aria-hidden />
                <h2 className="text-2xl text-cream">{assist.title}</h2>
                <ul className="mt-6 space-y-4 text-cream/85">
                  <li className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/10"><Icon name="call" /></span>
                    <span>{assist.phones.join("  ·  ")}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/10"><Icon name="mail" /></span>
                    <span className="break-all">{assist.email}</span>
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
          {/* Form */}
          <Reveal delay={0.1} className="lg:col-span-7">
            <div id="enroll" className="scroll-mt-28 rounded-xl4 bg-white p-8 shadow-soft sm:p-10">
              <h2 className="text-2xl text-emerald-deep">{form.title}</h2>
              <p className="mt-2 text-ink/70">{form.subtitle}</p>
              {/* Privacy consent line lives inside InquiryForm so admissions
                  and the contact page stay consistent. */}
              <div className="mt-8"><InquiryForm programs={programs} /></div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
