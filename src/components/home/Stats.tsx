import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { Doodle } from "@/components/ui/Doodle";

const numberTone = ["text-emerald", "text-coral", "text-grape"];

export function Stats() {
  return (
    <Section className="relative overflow-hidden pb-12 pt-12">
      <Doodle kind="star" color="#c9a227" motion="twinkle" className="left-[6%] top-6 w-5" />
      <Doodle kind="sparkle" color="#6fb2f0" motion="twinkle" className="bottom-6 right-[8%] w-5" />
      <Container className="relative z-10 flex flex-wrap justify-center gap-4">
        {home.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div className="min-w-[11rem] rounded-xl3 bg-white px-7 py-6 text-center shadow-soft">
              <p className={`font-display text-[2.4rem] font-extrabold leading-none ${numberTone[i % numberTone.length]}`}>
                <CountUp to={s.value} />
                {s.suffix && <span className="text-xl">{s.suffix}</span>}
              </p>
              <p className="mt-2 text-sm font-bold text-ink/60">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </Container>
    </Section>
  );
}
