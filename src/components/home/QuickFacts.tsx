import { home } from "@/content/home";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SwipeRail } from "@/components/ui/SwipeRail";
import { TONES } from "@/components/ui/FeatureCard";
import { cn } from "@/lib/cn";

const tints = {
  emerald: "bg-emerald/10 text-emerald",
  coral: "bg-coral-soft text-coral",
  grape: "bg-grape-soft text-grape",
  gold: "bg-gold-soft text-gold",
  sky: "bg-sky-soft text-sky",
  leaf: "bg-leaf-soft text-leaf",
};

export function QuickFacts() {
  return (
    <Container className="-mt-2 pb-4">
      <Reveal>
        <SwipeRail label="Quick facts" cols={4} cardClassName="w-[68%]">
          {home.quickFacts.map((f, i) => (
            <div
              key={f.label}
              className="flex h-full items-center gap-3 rounded-xl3 bg-white px-5 py-5 shadow-soft transition duration-200 hover:-translate-y-1.5 hover:shadow-lift"
            >
              <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tints[TONES[i % TONES.length]])}>
                <Icon name={f.icon} className="text-[24px]" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{f.label}</p>
                <p className="font-display text-lg font-semibold text-emerald-deep">{f.value}</p>
              </div>
            </div>
          ))}
        </SwipeRail>
      </Reveal>
    </Container>
  );
}
