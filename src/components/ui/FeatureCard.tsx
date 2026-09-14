import { Icon } from "./Icon";
import { cn } from "@/lib/cn";

const tones = {
  emerald: "bg-emerald/10 text-emerald",
  gold: "bg-gold-soft text-gold",
  coral: "bg-coral-soft text-coral",
  grape: "bg-grape-soft text-grape",
  sky: "bg-sky-soft text-sky",
  leaf: "bg-leaf-soft text-leaf",
};

export type Tone = keyof typeof tones;

export const TONES: Tone[] = ["emerald", "coral", "grape", "gold", "sky", "leaf"];

export function FeatureCard({
  icon,
  title,
  body,
  tone = "emerald",
}: {
  icon: string;
  title: string;
  body: string;
  tone?: Tone;
}) {
  return (
    <div className="group relative h-full overflow-hidden rounded-xl4 bg-white p-6 shadow-soft sm:p-8 transition duration-200 hover:-translate-y-2 hover:-rotate-1 hover:shadow-lift">
      <span className={cn("inline-flex h-16 w-16 items-center justify-center rounded-2xl", tones[tone])}>
        <Icon name={icon} className="text-[30px]" />
      </span>
      <h3 className="mt-6 text-2xl text-emerald-deep">{title}</h3>
      <p className="mt-3 leading-relaxed text-ink/70">{body}</p>
    </div>
  );
}
