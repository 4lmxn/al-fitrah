import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { CTABand } from "@/components/ui/CTABand";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Doodle } from "@/components/ui/Doodle";
import { RainbowWords } from "@/components/ui/Rainbow";
import { TONES } from "@/components/ui/FeatureCard";
import { cn } from "@/lib/cn";

// Async because the brand comes from configuration; a module-scope
// constant cannot await, which is what kept school identity hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/syllabus", {
  title: "Syllabus",
  description: "3-year integrated preschool syllabus: Noor-ul-Bayan Qur'an & Arabic, Aqeedah & Hadith, plus Oxford Early Learning English, Maths & EVS, year by year.",
});
}

// Same tint set the shared FeatureCard uses, applied here because these cards
// carry a different layout.
const tints = {
  emerald: "bg-emerald/10 text-emerald",
  gold: "bg-gold-soft text-gold",
  coral: "bg-coral-soft text-coral",
  grape: "bg-grape-soft text-grape",
  sky: "bg-sky-soft text-sky",
  leaf: "bg-leaf-soft text-leaf",
};

const strands = [
  { icon: "menu_book", title: "Qur'an & Tajweed", body: "Qur'an reading and fluency with the rules of recitation, building toward memorization of up to 2 Juz of selected Surahs by the end of the program." },
  { icon: "translate", title: "Arabic with Noor-ul-Bayan", body: "Letter recognition, joining, and reading fluency using the Noor-ul-Bayan System (Anjuman Taleemul Qur'an, Calicut)." },
  { icon: "auto_awesome", title: "Aqeedah, Hadith & manners", body: "Islamic beliefs, Hadith, daily Du'as, and Islamic etiquettes (adab) woven gently through the day." },
  { icon: "language", title: "English & literacy", body: "Phonics, letter recognition, vocabulary, listening & speaking, and early reading & writing readiness (Oxford Early Learning)." },
  { icon: "calculate", title: "Mathematics", body: "Number recognition, counting, patterns, shapes, and logical thinking & problem solving." },
  { icon: "public", title: "Environmental studies (EVS)", body: "Understanding the world, nature & community awareness, health & hygiene, and observation skills." },
];


export default function SyllabusPage() {
  return (
    <>
      <PageHero
        eyebrow="3-year integrated program"
        title="Our syllabus."
        highlight={["syllabus"]}
        subtitle="The subject-by-subject detail behind the three-year programme. If you want to know what each year feels like instead, the programmes page walks through it year by year."
      />

      <Section className="relative overflow-hidden pt-0">
        <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="right-[7%] top-6 w-5" />
        <Container className="relative z-10">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl"><RainbowWords text="Six learning strands" words={["strands"]} /></h2>
            <p className="mt-3 text-lg text-ink/70">
              These six run through all three years, deepening each time rather than being taught once and dropped.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {strands.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05} className="h-full">
                <div className="h-full rounded-xl4 bg-white p-7 shadow-soft transition duration-200 hover:-translate-y-2 hover:-rotate-1 hover:shadow-lift">
                  <span className={cn("inline-flex h-14 w-14 items-center justify-center rounded-2xl", tints[TONES[i % TONES.length]])}>
                    <Icon name={s.icon} className="text-[26px]" />
                  </span>
                  <h3 className="mt-5 text-xl text-emerald-deep">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/70">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-cream-deep/60">
        <Container className="max-w-3xl text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl">
              <RainbowWords text="Want it year by year instead?" words={["year by year"]} />
            </h2>
            <p className="mt-4 text-lg text-ink/70">
              The programmes page takes the same six strands and shows how they land in Pre-KG,
              Junior KG and Senior KG, with what changes between each.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/programs">See the three years</Button>
            </div>
            <p className="mt-10 text-sm text-ink/55">
              This outline is indicative. Exact milestones, materials, and assessments are shared with families during admissions.
            </p>
          </Reveal>
        </Container>
      </Section>

      <CTABand
        title="Questions about the curriculum?"
        subtitle="Our team will gladly walk you through the syllabus and how it fits your child."
        cta={{ label: "Talk to admissions", href: "/admissions" }}
        icon="school"
      />
    </>
  );
}
