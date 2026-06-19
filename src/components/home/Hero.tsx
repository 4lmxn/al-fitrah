// src/components/home/Hero.tsx
"use client";
import { motion } from "framer-motion";
import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export function Hero() {
  const { hero } = home;
  return (
    <section data-testid="hero" className="bg-cream pt-16 pb-20 sm:pt-24">
      <Container className="max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold uppercase tracking-wide text-gold"
        >
          {hero.eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mt-4 text-4xl leading-tight sm:text-5xl"
        >
          {hero.title}
        </motion.h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink/70">{hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {hero.ctas.map((c) => (
            <Button key={c.href} href={c.href} variant={c.variant}>{c.label}</Button>
          ))}
        </div>
      </Container>
    </section>
  );
}
