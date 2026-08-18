import { facts } from "@/content/facts";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/EyebrowPill";
import { RainbowWords } from "@/components/ui/Rainbow";
import { Doodle } from "@/components/ui/Doodle";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { TONES } from "@/components/ui/FeatureCard";
import { cn } from "@/lib/cn";

/**
 * Sections driven entirely by `content/facts.ts`.
 *
 * Every one of these returns `null` while its slot is empty. That is deliberate
 * and load-bearing: a half-filled "Our fees" heading over a "coming soon" is
 * worse than no fees section at all, and an invented ratio is worse than both.
 * The school fills a slot, the section appears; nothing else has to change.
 */

const tints = {
  emerald: "bg-emerald/10 text-emerald",
  gold: "bg-gold-soft text-gold",
  coral: "bg-coral-soft text-coral",
  grape: "bg-grape-soft text-grape",
  sky: "bg-sky-soft text-sky",
  leaf: "bg-leaf-soft text-leaf",
};

/** Icon + title + body cards. Covers settling-in, safety, communication, health. */
export function FactSection({
  items,
  eyebrow,
  title,
  rainbow,
  subtitle,
  tone = "cream",
}: {
  items: { icon: string; title: string; body: string }[];
  eyebrow: string;
  title: string;
  rainbow?: string[];
  subtitle?: string;
  tone?: "cream" | "deep";
}) {
  if (items.length === 0) return null;
  return (
    <Section className={cn("relative overflow-hidden", tone === "deep" && "bg-cream-deep/60")}>
      <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="right-[7%] top-[12%] w-5" />
      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text={title} words={rainbow} />
          </h2>
          {subtitle && <p className="mt-4 text-lg text-ink/70">{subtitle}</p>}
        </Reveal>
        <SwipeRail label={title} cols={3} className="mt-12">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.07} className="h-full">
              <div className="h-full rounded-xl4 bg-white p-7 shadow-soft transition duration-200 hover:-translate-y-2 hover:-rotate-1 hover:shadow-lift">
                <span className={cn("grid h-14 w-14 place-items-center rounded-2xl", tints[TONES[i % TONES.length]])}>
                  <Icon name={item.icon} className="text-[26px]" />
                </span>
                <h3 className="mt-5 text-xl text-emerald-deep">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/70">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </SwipeRail>
      </Container>
    </Section>
  );
}

/** Headline numbers — ratio, class size, staff count. */
export function KeyFacts() {
  if (facts.keyFacts.length === 0) return null;
  return (
    <Section className="relative overflow-hidden pb-12 pt-12 sm:pb-12 sm:pt-12">
      <Container className="relative z-10 flex flex-wrap justify-center gap-4">
        {facts.keyFacts.map((f, i) => (
          <Reveal key={f.label} delay={i * 0.07}>
            <div className="flex min-w-[13rem] items-center gap-3 rounded-xl3 bg-white px-6 py-5 shadow-soft">
              <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tints[TONES[i % TONES.length]])}>
                <Icon name={f.icon} className="text-[24px]" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{f.label}</p>
                <p className="font-display text-xl font-bold text-emerald-deep">{f.value}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </Container>
    </Section>
  );
}

/**
 * The fee schedule.
 *
 * A parent who cannot find a price does not enquire to discover it — they close
 * the tab and open a competitor's. This is the highest-value slot in the file.
 */
export function Fees() {
  const f = facts.fees;
  if (!f) return null;
  return (
    <Section className="relative overflow-hidden bg-cream-deep/60">
      <Doodle kind="star" color="#c9a227" motion="twinkle" className="left-[6%] top-[12%] w-5" />
      <Container className="relative z-10 max-w-3xl">
        <Reveal className="text-center">
          <Eyebrow>What it costs</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text="Fees, in full and up front." words={["full"]} />
          </h2>
          <p className="mt-4 text-lg text-ink/70">{f.intro}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-xl4 bg-white shadow-soft">
            <table className="w-full text-left">
              <tbody>
                {f.rows.map((r) => (
                  <tr key={r.label} className="border-b border-ink/5 last:border-0">
                    <th scope="row" className="px-6 py-5 font-display text-lg font-semibold text-emerald-deep">
                      {r.label}
                      {r.note && <span className="mt-0.5 block font-sans text-sm font-normal text-ink/55">{r.note}</span>}
                    </th>
                    <td className="whitespace-nowrap px-6 py-5 text-right font-display text-xl font-bold tabular-nums text-ink">
                      {r.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-sm text-ink/55">{f.footnote}</p>
        </Reveal>
      </Container>
    </Section>
  );
}

/** Named teachers. "Guided by experts" is a claim; a name and a qualification is evidence. */
export function Teachers() {
  if (facts.teachers.length === 0) return null;
  return (
    <Section className="relative overflow-hidden">
      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Who teaches your child</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text="The people in the room." words={["people"]} />
          </h2>
        </Reveal>
        <SwipeRail label="Our teachers" cols={3} className="mt-12">
          {facts.teachers.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.07}>
              <div className="rounded-xl4 bg-white p-7 text-center shadow-soft">
                <span className={cn("mx-auto grid h-16 w-16 place-items-center rounded-full font-display text-2xl font-bold", tints[TONES[i % TONES.length]])}>
                  {t.name.trim().charAt(0)}
                </span>
                <h3 className="mt-4 text-xl text-emerald-deep">{t.name}</h3>
                <p className="font-display text-sm font-semibold text-coral">{t.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{t.credentials}</p>
              </div>
            </Reveal>
          ))}
        </SwipeRail>
      </Container>
    </Section>
  );
}

/**
 * The timetable, with clock times.
 *
 * "Morning arrival and circle time" tells a parent nothing they could not have
 * guessed. "9:00 — arrival and free play" tells them what their child's morning
 * is actually shaped like.
 */
export function DayTimeline() {
  if (facts.day.length === 0) return null;
  return (
    <Section className="relative overflow-hidden bg-cream-deep/60">
      <Doodle kind="sun" color="#c9a227" className="left-[4%] top-10 w-14" />
      <Container className="relative z-10 max-w-3xl">
        <Reveal className="text-center">
          <Eyebrow>A day at Al Fitrah</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text="Hour by hour." words={["Hour"]} />
          </h2>
        </Reveal>
        <ol className="mt-12 space-y-4">
          {facts.day.map((b, i) => (
            <Reveal key={b.time} delay={i * 0.05}>
              <li className="flex gap-5 rounded-xl4 bg-white p-6 shadow-soft">
                <span className="shrink-0 font-display text-lg font-bold tabular-nums text-emerald">{b.time}</span>
                <div className="border-l-2 border-emerald/10 pl-5">
                  <h3 className="text-lg text-emerald-deep">{b.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink/70">{b.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
