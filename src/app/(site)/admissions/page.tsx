import type { Metadata } from "next";
import { admissions } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { InquiryForm } from "@/components/pages/InquiryForm";

export const metadata: Metadata = {
  title: "Admissions",
  description: "A clear, supportive admissions process for the 2026–27 year. Submit an inquiry and our team will reach out.",
};

export default function AdmissionsPage() {
  const { hero, process, assist, form } = admissions;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />

      <Section className="pt-0">
        <Container className="grid gap-8 lg:grid-cols-12">
          {/* Process + assistance */}
          <div className="space-y-8 lg:col-span-5">
            <Reveal>
              <div className="rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
                <h2 className="flex items-center gap-3 text-2xl text-emerald-deep">
                  <Icon name="list_alt" className="text-gold" /> {process.title}
                </h2>
                <ol className="mt-8 space-y-7">
                  {process.steps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald/8 font-display text-lg text-emerald ring-1 ring-emerald/10">
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
              <div className="relative overflow-hidden rounded-xl3 bg-emerald-deep p-8 text-cream shadow-lift">
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
            <div id="enroll" className="scroll-mt-28 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft sm:p-10">
              <h2 className="text-2xl text-emerald-deep">{form.title}</h2>
              <p className="mt-2 text-ink/70">{form.subtitle}</p>
              <div className="mt-8"><InquiryForm /></div>
              <p className="mt-4 text-xs text-ink/50">{form.note}</p>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
