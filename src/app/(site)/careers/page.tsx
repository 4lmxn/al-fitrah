import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { CareersForm } from "@/components/pages/CareersForm";
import { listActiveOpenings } from "@/lib/jobOpenings";

export const metadata = pageMeta("/careers", {
  title: "Careers",
  description: "Nurturing, qualified educators wanted at Al Fitrah Pre School, Sarjapura, Bengaluru — blend early-years teaching with Islamic values. Apply today.",
});

// Openings change through the year and are managed from the admin console, so
// this page must reflect Firestore on every request.
export const dynamic = "force-dynamic";

const values = [
  { icon: "favorite", title: "Purposeful work", body: "Shape the earliest years of a child's life, nurturing both Deen and Dunya in a calm, respectful environment." },
  { icon: "school", title: "Grow with us", body: "Ongoing training in the Oxford Early Learning Curriculum and the Noor-ul-Bayan Qur'anic method, with mentorship from experienced educators." },
  { icon: "diversity_3", title: "A real community", body: "Work alongside a warm, supportive team that treats colleagues and families with empathy and care." },
];

const benefits = [
  "Supportive, values-driven workplace",
  "Professional development and training",
  "Collaborative, respectful team culture",
  "A meaningful role in children's foundational years",
];

// A Firestore blip must not take down the apply form — it is the whole point
// of the page. Degrade to "no listed openings" and let the general application
// through instead of throwing the route to the error boundary.
async function safeOpenings() {
  try {
    return await listActiveOpenings();
  } catch (err) {
    console.error("careers: openings read failed", err);
    return [];
  }
}

export default async function CareersPage() {
  const openings = await safeOpenings();
  const roleNames = openings.map((o) => o.title);
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
            <p className="mt-3 text-lg text-ink/70">
              {openings.length > 0
                ? "Roles we're hiring for right now. Don't see your fit? We still welcome your application."
                : "We don't have any positions open at the moment — but we're always glad to hear from nurturing educators. Send us your application below and we'll reach out when a role opens."}
            </p>
          </Reveal>
          {openings.length > 0 && (
            <div className="mt-10 space-y-4">
              {openings.map((o, i) => (
                <Reveal key={o.id} delay={i * 0.05}>
                  <div className="flex flex-col gap-4 rounded-xl3 border border-emerald/10 bg-white/80 p-7 shadow-soft sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl text-emerald-deep">{o.title}</h3>
                        <span className="rounded-full bg-emerald/8 px-3 py-1 text-xs font-semibold text-emerald-deep">{o.employmentType}</span>
                      </div>
                      {o.summary && <p className="mt-2 leading-relaxed text-ink/70">{o.summary}</p>}
                      {o.requirements.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {o.requirements.map((req) => (
                            <li key={req} className="flex gap-2.5 text-sm text-ink/75">
                              <Icon name="check_circle" className="mt-0.5 shrink-0 text-[18px] text-gold" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <a
                      href="#apply"
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald/8 px-4 py-2 text-sm font-semibold text-emerald-deep transition hover:bg-emerald/15"
                    >
                      Apply below <Icon name="south" className="text-[16px]" />
                    </a>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
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
                <CareersForm roles={roleNames} />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
