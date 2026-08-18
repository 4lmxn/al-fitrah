import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Icon } from "@/components/ui/Icon";
import { CTABand } from "@/components/ui/CTABand";
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

const years = [
  {
    year: "Year 1 · Pre-KG (Beginner / Level 0), entry 2y10m-3y10m",
    points: [
      "Settling in, routines, and circle time; building confidence and language.",
      "Qur'an: short Surahs by listening and repetition; Noor-ul-Bayan letter foundations.",
      "English phonics readiness and early numeracy through play.",
      "Du'as, Islamic manners, and learning through hands-on play.",
    ],
  },
  {
    year: "Year 2 · Junior KG (Level 1)",
    points: [
      "Qur'an: continued reading with introductory Tajweed; Arabic letter joining.",
      "English phonics and early writing; expanding mathematics.",
      "EVS: nature, community, health, and hygiene awareness.",
      "Aqeedah basics, Hadith for children, and Du'as for daily life.",
    ],
  },
  {
    year: "Year 3 · Senior KG (Level 2)",
    points: [
      "Qur'an: fluency and revision toward memorization of up to 2 Juz with Tajweed.",
      "Arabic: reading fluency and simple comprehension.",
      "English reading & writing and numeracy toward Grade 1 readiness.",
      "Stronger independence, responsibility, and Islamic character habits.",
    ],
  },
];

export default function SyllabusPage() {
  return (
    <>
      <PageHero
        eyebrow="3-year integrated program"
        title="Our syllabus."
        highlight={["syllabus"]}
        subtitle="A balanced journey across Qur'an, Arabic, English, Mathematics, and character, building strong foundations for both Deen and Dunya."
      />

      <Section className="relative overflow-hidden pt-0">
        <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="right-[7%] top-6 w-5" />
        <Container className="relative z-10">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl"><RainbowWords text="Learning strands" words={["strands"]} /></h2>
            <p className="mt-3 text-lg text-ink/70">Six connected strands run through every year of the program.</p>
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
        <Container>
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl"><RainbowWords text="Year by year" words={["year"]} /></h2>
            <p className="mt-3 text-lg text-ink/70">An indicative progression. Pace is adapted to each child and refined per cohort.</p>
          </Reveal>
          <div className="mt-10 space-y-6">
            {years.map((y, i) => (
              <Reveal key={y.year} delay={i * 0.06}>
                <div className="rounded-xl4 bg-white p-8 shadow-soft">
                  <h3 className="flex items-center gap-3 text-xl text-emerald-deep">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald/10 font-display text-emerald">{i + 1}</span>
                    {y.year}
                  </h3>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {y.points.map((p) => (
                      <li key={p} className="flex gap-3 text-ink/75">
                        <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-gold" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-sm text-ink/55">
            This outline is indicative. Exact milestones, materials, and assessments are shared with families during admissions.
          </p>
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
