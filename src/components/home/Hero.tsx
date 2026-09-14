"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Doodle } from "@/components/ui/Doodle";
import { RainbowWords } from "@/components/ui/Rainbow";

const chipTone = ["bg-emerald", "bg-coral", "bg-grape"];
const chipPos = [
  "bottom-6 -left-3 sm:-left-4",
  "top-8 -left-2 sm:-left-3",
  "bottom-20 -right-3 sm:-right-4",
];

export function Hero() {
  const { hero } = home;
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section data-testid="hero" className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
      <Doodle kind="sun" color="#c9a227" className="left-[2%] top-2 w-16" />
      <Doodle kind="sparkle" color="#b38cf4" motion="twinkle" className="left-[8%] top-32 w-6" />
      <Doodle kind="cloud" color="#dbeafe" motion="bob2" className="right-[46%] top-9 hidden w-11 sm:block" />
      <Doodle kind="dot" color="#7cc15e" motion="twinkle" className="bottom-8 left-[42%] hidden w-4 sm:block" />
      <Doodle kind="kite" color="#ee7f82" motion="sway" className="right-[9%] top-0 hidden w-8 text-grape lg:block" />

      <Container className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-xl">
          <motion.span
            {...rise(0)}
            className="inline-flex -rotate-1 items-center gap-2 rounded-full bg-white px-4 py-1.5 font-display text-sm font-semibold text-emerald-deep shadow-soft"
          >
            <Icon name="nature_people" className="text-base text-leaf" />
            {hero.eyebrow}
          </motion.span>
          <motion.h1 {...rise(0.06)} className="mt-6 text-[2.6rem] sm:text-6xl">
            <RainbowWords text={hero.title} words={hero.rainbow} />
          </motion.h1>
          <motion.p {...rise(0.12)} className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
            {hero.subtitle}
          </motion.p>
          <motion.div {...rise(0.18)} className="mt-9 flex flex-wrap items-center gap-3">
            <Button href={hero.cta.href} variant={hero.cta.variant}>
              {hero.cta.label}
              <Icon name="arrow_forward" className="text-[18px]" />
            </Button>
            <Button href="/programs" variant="white">Peek at our programs</Button>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[26rem] lg:max-w-none"
        >
          <Doodle kind="crescent" color="#c9a227" motion="bob2" className="-top-4 right-[6%] z-20 w-12" />
          {/* Organic frame: a thick white border and a border-radius that keeps
              shifting, so the photo reads cut-out rather than cropped. */}
          <div className="blob relative z-10 aspect-[4/5] overflow-hidden border-[9px] border-white shadow-lift">
            <Image
              src={hero.image}
              alt={hero.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="object-cover"
            />
          </div>
          {hero.chips.map((c, i) => (
            <span
              key={c.label}
              className={`absolute z-20 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 font-display text-sm font-semibold text-ink shadow-soft ${chipPos[i]}`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] text-white ${chipTone[i]}`}>
                <Icon name={c.icon} className="text-[17px]" />
              </span>
              {c.label}
            </span>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
