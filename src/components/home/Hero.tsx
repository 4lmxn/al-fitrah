"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function Hero() {
  const { hero } = home;
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section data-testid="hero" className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-xl">
          <motion.span {...rise(0)} className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-deep ring-1 ring-gold/30">
            <Icon name="calendar_month" className="text-base" />
            {hero.eyebrow}
          </motion.span>
          <motion.h1 {...rise(0.06)} className="mt-6 text-[2.6rem] leading-[1.05] sm:text-6xl">
            {hero.title}
          </motion.h1>
          <motion.p {...rise(0.12)} className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
            {hero.subtitle}
          </motion.p>
          <motion.div {...rise(0.18)} className="mt-9 flex flex-wrap items-center gap-4">
            <Button href={hero.cta.href} variant={hero.cta.variant}>{hero.cta.label}</Button>
            <a href="/programs" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-deep">
              Explore our programs
              <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -right-6 -top-6 hidden h-28 w-28 rounded-full bg-gold/15 blur-2xl sm:block" aria-hidden />
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl3 border border-emerald/10 shadow-lift">
            <Image src={hero.image} alt={hero.imageAlt} fill priority sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-5 left-6 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10">
            <Icon name="favorite" className="text-base text-gold" />
            {hero.badge}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
