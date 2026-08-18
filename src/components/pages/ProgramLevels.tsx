import { programs } from "@/content/pages";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { RainbowWords } from "@/components/ui/Rainbow";
import { Doodle } from "@/components/ui/Doodle";
import { cn } from "@/lib/cn";
import { SwipeRail } from "@/components/ui/SwipeRail";

// One illustration per year, inline SVG. Photographs would be dishonest here —
// we do not have a picture that is specifically "the Junior KG room" — and the
// drawings carry the hand-made feel the rest of the site uses.
const illustrations = [
  // Pre-KG — stacking blocks
  <svg key="blocks" viewBox="0 0 100 100" aria-hidden className="h-28 w-28">
    <rect x="22" y="54" width="30" height="30" rx="6" fill="#ee7f82" />
    <path d="M31 69l4 4 6-8" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="50" y="54" width="30" height="30" rx="6" fill="#6fb2f0" />
    <circle cx="65" cy="69" r="7" fill="#fff" />
    <rect x="36" y="24" width="30" height="30" rx="6" fill="#c9a227" />
    <path d="M51 30l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" fill="#fff" />
  </svg>,
  // Junior KG — crayons
  <svg key="crayons" viewBox="0 0 100 100" aria-hidden className="h-28 w-28">
    <g transform="rotate(-12 50 50)">
      <rect x="26" y="30" width="12" height="44" rx="4" fill="#ee7f82" />
      <path d="M26 30l6-10 6 10z" fill="#f7b0b1" />
      <rect x="44" y="26" width="12" height="48" rx="4" fill="#c9a227" />
      <path d="M44 26l6-10 6 10z" fill="#e3c97c" />
      <rect x="62" y="32" width="12" height="42" rx="4" fill="#7cc15e" />
      <path d="M62 32l6-10 6 10z" fill="#aed99a" />
    </g>
  </svg>,
  // Senior KG — open book under a star
  <svg key="book" viewBox="0 0 100 100" aria-hidden className="h-28 w-28">
    <path d="M50 40c-8-6-18-6-26-3v34c8-3 18-3 26 3z" fill="#fff" stroke="#065f46" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M50 40c8-6 18-6 26-3v34c-8-3-18-3-26 3z" fill="#fff" stroke="#065f46" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M31 48h12M31 55h12M57 48h12M57 55h12" stroke="#cfe6e0" strokeWidth="3" strokeLinecap="round" />
    <path d="M50 12l3 6.5 7 .9-5.2 4.9 1.3 7L50 28l-6.4 3.3 1.3-7L39.7 19.4l7-.9z" fill="#c9a227" />
  </svg>,
];

const artBg = ["bg-coral-soft", "bg-gold-soft", "bg-emerald/10"];
const badgeTone = ["text-coral", "text-gold", "text-emerald"];

const rows = (l: (typeof programs.levels.items)[number]) => [
  { icon: "menu_book", label: "Qur'an & Arabic", body: l.quran },
  { icon: "school", label: "Academics", body: l.academics },
  { icon: "volunteer_activism", label: "Character & Deen", body: l.character },
];

export function ProgramLevels() {
  const { levels } = programs;
  return (
    <Section className="relative overflow-hidden bg-cream-deep/60">
      <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="right-[7%] top-[6%] w-5" />
      <Doodle kind="dot" color="#7cc15e" motion="twinkle" className="bottom-[8%] left-[5%] w-4" />
      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl">
            <RainbowWords text={levels.title} words={levels.rainbow} />
          </h2>
          <p className="mt-4 text-lg text-ink/70">{levels.subtitle}</p>
        </Reveal>

        <SwipeRail label="The three years" cols={1} className="mt-14 sm:space-y-8">
          {levels.items.map((l, i) => (
            <Reveal key={l.name} delay={i * 0.06}>
              <article className="grid gap-8 rounded-xl4 bg-white p-6 shadow-soft sm:p-8 sm:p-10 lg:grid-cols-[auto_1fr]">
                <div className="flex flex-row items-center gap-4 lg:w-56 lg:flex-col">
                  <div className={cn("grid h-20 w-20 shrink-0 place-items-center rounded-[1.5rem] sm:h-40 sm:w-40 sm:rounded-[2.5rem]", artBg[i % artBg.length])}>
                    <span className="[&>svg]:h-14 [&>svg]:w-14 sm:[&>svg]:h-28 sm:[&>svg]:w-28">
                      {illustrations[i % illustrations.length]}
                    </span>
                  </div>
                  <span className={cn("font-display text-sm font-bold uppercase tracking-widest", badgeTone[i % badgeTone.length])}>
                    {l.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl text-emerald-deep sm:text-3xl">{l.name}</h3>
                  <p className="mt-1 font-display text-sm font-semibold text-ink/55 sm:text-base">{l.stage}</p>
                  <p className="mt-3 leading-relaxed text-ink/75 sm:mt-4 sm:text-lg">{l.summary}</p>

                  <dl className="mt-5 grid gap-4 sm:mt-7 sm:gap-5 sm:grid-cols-3">
                    {rows(l).map((r) => (
                      <div key={r.label}>
                        <dt className="flex items-center gap-2 font-display text-sm font-bold text-emerald">
                          <Icon name={r.icon} className="text-[18px]" />
                          {r.label}
                        </dt>
                        <dd className="mt-1 text-sm leading-relaxed text-ink/70">{r.body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            </Reveal>
          ))}
        </SwipeRail>
      </Container>
    </Section>
  );
}
