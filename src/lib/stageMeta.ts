// Strict brand palette only: emerald (primary), gold (attention), ink-neutral
// (dead). Stage colour is functional — it encodes pipeline progress as
// deepening emerald: gold "new" → faint → medium emerald → solid emerald
// "won" → muted neutral "lost". No off-brand hues, no decorative gradients.

export type StageGroup = "new" | "active" | "won" | "lost";

export type StageMeta = {
  label: string;
  group: StageGroup;
  pill: string; // bg + text + ring for the status pill
  dot: string;  // leading dot
};

const NEW    = { pill: "bg-gold-soft text-[#7a611a] ring-gold/30",        dot: "bg-gold" };
const FAINT  = { pill: "bg-emerald/[0.06] text-emerald ring-emerald/15",  dot: "bg-emerald/40" };
const MEDIUM = { pill: "bg-emerald/[0.12] text-emerald-deep ring-emerald/25", dot: "bg-emerald" };
const WON    = { pill: "bg-emerald text-cream ring-emerald-deep",         dot: "bg-gold-light" };
const LOST   = { pill: "bg-ink/[0.04] text-ink/50 ring-ink/10",          dot: "bg-ink/25" };

export const STAGE_META: Record<string, StageMeta> = {
  // shared
  new:       { label: "New",       group: "new",    ...NEW },
  // student pipeline (new → contacted → visited → applied → admitted → lost)
  contacted: { label: "Contacted", group: "active", ...FAINT },
  visited:   { label: "Visited",   group: "active", ...MEDIUM },
  applied:   { label: "Applied",   group: "active", ...MEDIUM },
  admitted:  { label: "Admitted",  group: "won",    ...WON },
  lost:      { label: "Lost",      group: "lost",   ...LOST },
  // legacy student stages — kept so pre-rename docs still render a valid pill
  toured:    { label: "Visited",   group: "active", ...MEDIUM },
  enrolled:  { label: "Admitted",  group: "won",    ...WON },
  closed:    { label: "Lost",      group: "lost",   ...LOST },
  // staff pipeline
  reviewing: { label: "Reviewing", group: "active", ...FAINT },
  interview: { label: "Interview", group: "active", ...MEDIUM },
  hired:     { label: "Hired",     group: "won",    ...WON },
  rejected:  { label: "Rejected",  group: "lost",   ...LOST },
};

export function stageMeta(stage: string): StageMeta {
  return STAGE_META[stage] ?? {
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
    group: "active",
    ...FAINT,
  };
}
