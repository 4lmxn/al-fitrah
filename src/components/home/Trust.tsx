import { trust } from "@/content/pages";
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

const tints = {
  emerald: "bg-emerald/10 text-emerald",
  gold: "bg-gold-soft text-gold",
  coral: "bg-coral-soft text-coral",
  grape: "bg-grape-soft text-grape",
  sky: "bg-sky-soft text-sky",
  leaf: "bg-leaf-soft text-leaf",
};

export function Trust() {
  return (
    <Section className="relative overflow-hidden bg-cream-deep/60">
      <Doodle kind="star" color="#c9a227" motion="twinkle" className="left-[6%] top-[12%] w-5" />
      <Doodle kind="crescent" color="#c9a227" motion="bob" className="right-[5%] top-[10%] hidden w-11 lg:block" />
      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{trust.eyebrow}</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            <RainbowWords text={trust.title} words={trust.rainbow} />
          </h2>
          <p className="mt-4 text-lg text-ink/70">{trust.subtitle}</p>
        </Reveal>
        <SwipeRail label="Why families trust us" cols={2} className="mt-12" cardClassName="w-[86%]">
          {trust.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.07} className="h-full">
              <div className="flex h-full flex-col gap-4 rounded-xl4 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1.5 hover:shadow-lift sm:flex-row sm:gap-5 sm:p-7">
                <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", tints[TONES[i % TONES.length]])}>
                  <Icon name={item.icon} className="text-[26px]" />
                </span>
                <div>
                  <h3 className="text-xl text-emerald-deep">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/70">{item.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </SwipeRail>
      </Container>
    </Section>
  );
}
