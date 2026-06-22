import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy — Al Fitrah Islamic Pre-School",
  description: "How Al Fitrah Islamic Pre-School collects, uses, and protects the personal information shared by families through our website and admissions inquiry form.",
};

const lastUpdated = "19 June 2026";

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

export default function PrivacyPage() {
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
              <h2 className="text-2xl text-cream">Contact us about privacy</h2>
              <p className="mt-3 text-cream/80">For any question about this policy or your data, reach out to us:</p>
              <div className="mt-5 space-y-1 text-cream/90">
                <p>{site.contact.address}</p>
                <p>{site.contact.phone}</p>
                <p>{site.contact.email}</p>
              </div>
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
