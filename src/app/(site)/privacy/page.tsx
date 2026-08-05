import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { getSettings } from "@/lib/settings";
import { getContact } from "@/lib/seo";

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/privacy", {
  title: "Privacy Policy",
  description: "How Al Fitrah Pre School collects, uses, and protects the personal information shared by families through our website and admissions inquiry form.",
});
}

const lastUpdated = "4 August 2026";

// Retention periods stated here must match what actually happens, or the policy
// is worse than none. The 12-month CV figure matches the Cloud Storage lifecycle
// rule in docs/ops.md §4 — change one and change the other.
const retention = [
  { what: "Admissions enquiries", how: "Kept while your child could still join us, and for up to 24 months after your last contact with us. Removed sooner on request." },
  { what: "Job applications and CVs", how: "Automatically deleted 12 months after they are submitted." },
  { what: "Website analytics", how: "Only collected if you agree. Retained by Google for 14 months, and never used to advertise to children." },
];

// DPDP requires people to know who else touches their data, by name.
const processors = [
  { name: "Google (Firebase)", role: "Hosts this website and stores enquiry and student records securely, on servers in the United States." },
  { name: "Resend", role: "Delivers the notification emails our admissions team receives." },
];

const collect = [
  { icon: "person", title: "Information you give us", body: "When you submit an admissions inquiry, we collect your name, phone number, email address, your child's age band, and any message you choose to share." },
  { icon: "analytics", title: "Information collected automatically", body: "Like most websites, our hosting may record basic technical data such as your IP address and browser type to keep the site secure and reliable." },
];

const uses = [
  "Respond to your admissions inquiry and arrange a campus tour or call.",
  "Share information about our programs, fees, and the enrollment process.",
  "Maintain the security and proper functioning of our website.",
  "Comply with any legal or regulatory obligations that apply to us.",
];

const rights = [
  "Request a copy of the personal information we hold about you.",
  "Ask us to correct information that is inaccurate or incomplete.",
  "Ask us to delete your inquiry data when it is no longer needed.",
  "Withdraw your inquiry at any time by contacting us directly.",
];

export default async function PrivacyPage() {
  const [{ school }, contact] = await Promise.all([getSettings(), getContact()]);
  return (
    <>
      <PageHero
        eyebrow="Your privacy matters"
        title="Privacy policy."
        subtitle="We collect only what we need to support your family through admissions, and we protect it with care. This policy explains what we gather and why."
      />

      <Section className="pt-0">
        <Container className="max-w-3xl">
          <Reveal>
            <p className="text-sm text-ink/55">Last updated: {lastUpdated}</p>
          </Reveal>

          <Reveal className="mt-10">
            <h2 className="text-2xl text-emerald-deep">What we collect</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {collect.map((c) => (
                <div key={c.title} className="rounded-xl3 border border-emerald/10 bg-white/80 p-7 shadow-soft">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
                    <Icon name={c.icon} className="text-[22px]" />
                  </span>
                  <h3 className="mt-4 text-lg text-emerald-deep">{c.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/70">{c.body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <h2 className="text-2xl text-emerald-deep">How we use your information</h2>
            <ul className="mt-5 space-y-3">
              {uses.map((u) => (
                <li key={u} className="flex gap-3 text-ink/75">
                  <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-gold" />
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="mt-12">
            <div className="rounded-xl3 border border-emerald/10 bg-cream-deep/60 p-8 shadow-soft">
              <h2 className="text-2xl text-emerald-deep">How we protect it</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink/75">
                <p>Inquiry submissions are stored securely on Google Firebase infrastructure and are accessible only to authorised Al Fitrah admissions staff. We do not sell, rent, or trade your personal information.</p>
                <p>We keep your inquiry only as long as needed to support your admissions journey. We may share information with trusted service providers (such as our hosting and email partners) solely to operate this website, and only under appropriate confidentiality terms.</p>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <h2 className="text-2xl text-emerald-deep">Your child&apos;s information</h2>
            <div className="mt-4 space-y-4 leading-relaxed text-ink/75">
              <p>
                An admissions enquiry asks for your child&apos;s name, age band and, optionally, date of
                birth. Under India&apos;s Digital Personal Data Protection Act 2023, a child&apos;s
                information carries additional protection, and we treat it that way.
              </p>
              <p>
                We only accept enquiries submitted by a parent or legal guardian, and by submitting
                one you confirm you are that person. We do not track children&apos;s behaviour across
                websites, and we never use your child&apos;s information for advertising or share it
                for anyone else&apos;s marketing.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <h2 className="text-2xl text-emerald-deep">How long we keep it</h2>
            <ul className="mt-5 space-y-3">
              {retention.map((r) => (
                <li key={r.what} className="flex gap-3 text-ink/75">
                  <Icon name="schedule" className="mt-0.5 shrink-0 text-[20px] text-gold" />
                  <span>
                    <b className="font-semibold text-emerald-deep">{r.what}</b> — {r.how}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="mt-12">
            <h2 className="text-2xl text-emerald-deep">Who else handles it</h2>
            <p className="mt-3 leading-relaxed text-ink/75">
              We use a small number of service providers to run this website. They process your
              information only on our instructions, and never for their own purposes.
            </p>
            <p className="mt-3 leading-relaxed text-ink/75">
              Some of these providers store data outside India, including in the United States. The
              protections described in this policy apply wherever your information is held, and it is
              never transferred to a country the Government of India has restricted.
            </p>
            <ul className="mt-5 space-y-3">
              {processors.map((p) => (
                <li key={p.name} className="flex gap-3 text-ink/75">
                  <Icon name="cloud" className="mt-0.5 shrink-0 text-[20px] text-gold" />
                  <span>
                    <b className="font-semibold text-emerald-deep">{p.name}</b> — {p.role}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="mt-12">
            <h2 className="text-2xl text-emerald-deep">Your rights</h2>
            <ul className="mt-5 space-y-3">
              {rights.map((r) => (
                <li key={r} className="flex gap-3 text-ink/75">
                  <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-gold" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="mt-12">
            <div className="rounded-xl3 bg-emerald-deep p-8 text-cream shadow-lift">
              <h2 className="text-2xl text-cream">Grievance officer</h2>
              <p className="mt-3 text-cream/80">
                If you have a question or a complaint about how we handle your information — including
                a request to see, correct or delete it — contact:
              </p>
              <div className="mt-5 space-y-1 text-cream/90">
                <p className="font-semibold">{school.grievanceOfficerName || school.name}</p>
                <p>{school.grievanceOfficerEmail}</p>
                <p>{contact.phone}</p>
                <p className="pt-2 text-cream/70">{contact.addressLine}</p>
              </div>
              <p className="mt-5 text-sm text-cream/70">
                We aim to respond within 30 days. If you are not satisfied with our response, you may
                raise the matter with the Data Protection Board of India.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <p className="text-sm text-ink/55">
              We may update this policy from time to time. Material changes will be reflected by the &ldquo;last updated&rdquo; date above.
            </p>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
