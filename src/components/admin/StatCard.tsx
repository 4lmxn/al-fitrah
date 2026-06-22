import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

// Brand-strict tones only: emerald + gold. No off-brand status hues.
type Tone = "brand" | "gold" | "soft" | "deep";

const TONES: Record<Tone, { card: string; iconWrap: string; accent: string }> = {
  brand: { card: "ring-emerald/10",  iconWrap: "bg-emerald/8 text-emerald",        accent: "text-emerald-deep" },
  gold:  { card: "ring-gold/20",     iconWrap: "bg-gold-soft text-[#7a611a]",      accent: "text-[#7a611a]" },
  soft:  { card: "ring-emerald/10",  iconWrap: "bg-emerald/[0.07] text-emerald",   accent: "text-emerald" },
  deep:  { card: "ring-emerald-deep/15 bg-emerald-deep text-cream", iconWrap: "bg-cream/10 text-gold-light", accent: "text-cream" },
};

export function StatCard({
  label, value, icon, tone = "brand", hint,
}: {
  label: string;
  value: number | string;
  icon: string;
  tone?: Tone;
  hint?: string;
}) {
  const t = TONES[tone];
  const deep = tone === "deep";
  return (
    <div className={cn("rounded-2xl border p-5 shadow-soft ring-1", deep ? "border-emerald-deep" : "border-emerald/5 bg-white/90", t.card)}>
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", deep ? "text-cream/55" : "text-ink/45")}>{label}</p>
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", t.iconWrap)}>
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
      <p className={cn("mt-3 font-display text-3xl font-semibold tabular-nums", t.accent)}>{value}</p>
      {hint && <p className={cn("mt-1 text-xs", deep ? "text-cream/55" : "text-ink/50")}>{hint}</p>}
    </div>
  );
}
