import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { CareersForm } from "@/components/pages/CareersForm";

export const metadata: Metadata = {
  title: "Careers — Al Fitrah Islamic Pre-School",
  description: "Join the Al Fitrah team. We're looking for nurturing, qualified educators who blend academic excellence with Islamic values for young children in Sarjapura, Bengaluru.",
};

const values = [
  { icon: "favorite", title: "Purposeful work", body: "Shape the earliest years of a child's life, nurturing both Deen and Dunya in a calm, respectful environment." },
  { icon: "school", title: "Grow with us", body: "Ongoing training in Montessori method and the Noor-el-bayan approach, with mentorship from experienced educators." },
  { icon: "diversity_3", title: "A real community", body: "Work alongside a warm, supportive team that treats colleagues and families with empathy and care." },
];

const roles = [
  { title: "Qur'an & Arabic Teacher", type: "Full-time", body: "Teach recitation, Tajweed, and Arabic using the Noor-el-bayan method. Noor-el-bayan certification preferred." },
  { title: "Montessori Lead Teacher", type: "Full-time", body: "Lead a mixed-age classroom with hands-on Montessori materials and child-centric pedagogy. Montessori diploma required." },
  { title: "Assistant Teacher", type: "Full-time", body: "Support the lead teacher in daily routines, circle time, and care of young children. Experience with early years preferred." },
  { title: "Front Office & Admissions", type: "Full-time", body: "Be the welcoming first point of contact for families — manage inquiries, tours, and day-to-day coordination." },
];

const benefits = [
  "Supportive, values-driven workplace",
  "Professional development and training",
  "Collaborative, respectful team culture",
  "A meaningful role in children's foundational years",
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Join our team"
        title="Build futures with us."
        subtitle="We're always looking for nurturing, qualified educators who believe in honouring the natural goodness in every child."
      />

      <Section className="pt-0">
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06} className="h-full">
                <div className="h-full rounded-xl3 border border-emerald/10 bg-white/80 p-7 shadow-soft">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                    <Icon name={v.icon} className="text-[24px]" />
                  </span>
                  <h3 className="mt-5 text-xl text-emerald-deep">{v.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/70">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-cream-deep/60">
        <Container>
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl">Open positions</h2>
            <p className="mt-3 text-lg text-ink/70">Roles we hire for through the year. Don't see your fit? We still welcome your application.</p>
          </Reveal>
          <div className="mt-10 space-y-4">
            {roles.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.05}>
                <div className="flex flex-col gap-4 rounded-xl3 border border-emerald/10 bg-white/80 p-7 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl text-emerald-deep">{r.title}</h3>
                      <span className="rounded-full bg-emerald/8 px-3 py-1 text-xs font-semibold text-emerald-deep">{r.type}</span>
                    </div>
                    <p className="mt-2 leading-relaxed text-ink/70">{r.body}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald/8 px-4 py-2 text-sm font-semibold text-emerald-deep">
                    Apply below <Icon name="south" className="text-[16px]" />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="max-w-3xl">
          <Reveal>
            <div className="rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft sm:p-10">
              <h2 className="text-2xl text-emerald-deep">What we offer</h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {benefits.map((b) => (
                  <li key={b} className="flex gap-3 text-ink/75">
                    <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-gold" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section id="apply" className="bg-cream-deep/60">
        <Container className="max-w-3xl">
          <Reveal>
            <div className="rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft sm:p-10">
              <h2 className="text-2xl text-emerald-deep">Apply now</h2>
              <p className="mt-2 text-ink/70">Share your details and attach your CV. We review every application.</p>
              <div className="mt-8">
                <CareersForm roles={roles.map((r) => r.title)} />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
